#!/usr/bin/env python3
"""Automated diagnostics tool for image generation bottlenecks and isolated components.
Covers environment auditing, backend logic, isolated components connectivity, and proxy/system config.
"""

import os
import sys
import asyncio
import subprocess

# Add backend directory to path so app modules can be loaded
sys.path.insert(0, os.path.abspath("backend"))

def load_dot_env():
    """Manually parse .env file if it exists to populate os.environ."""
    if os.path.exists(".env"):
        print("[EnvLoader] Found .env file, loading environment variables...")
        with open(".env", "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip()
                    # Strip outer quotes if any
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    os.environ[key] = val
    else:
        print("[EnvLoader] No .env file found in root directory.")

async def test_endpoint(name, url, timeout=2.0):
    import httpx
    print(f"[{name}] Checking connectivity to: {url}")
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            res = await client.get(url)
            print(f"[{name}] Response Status: {res.status_code}")
            return True, f"Status: {res.status_code}"
    except httpx.ConnectTimeout:
        print(f"[{name}] Connect timeout after {timeout} seconds.")
        return False, "Connect timeout"
    except httpx.ConnectError as e:
        print(f"[{name}] Connect error: {e}")
        return False, f"Connect error: {e}"
    except Exception as e:
        print(f"[{name}] Unexpected error: {e}")
        return False, f"Error: {e}"

def check_nvidia_smi():
    print("[GPU/VRAM] Executing nvidia-smi...")
    try:
        res = subprocess.run(["nvidia-smi"], capture_output=True, text=True, check=False)
        if res.returncode == 0:
            print("[GPU/VRAM] nvidia-smi output:")
            print(res.stdout)
            return True, "nvidia-smi check passed"
        else:
            print("[GPU/VRAM] nvidia-smi failed or not available.")
            return False, f"nvidia-smi error: {res.stderr}"
    except FileNotFoundError:
        print("[GPU/VRAM] nvidia-smi command not found.")
        return False, "nvidia-smi not found"

def check_nginx_conf():
    print("[Nginx] Auditing proxy/nginx.conf for timeouts...")
    nginx_paths = ["proxy/nginx.conf", "proxy/nginx.http.conf"]
    audits = {}
    for path in nginx_paths:
        if os.path.exists(path):
            print(f"[Nginx] Found: {path}")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                read_timeouts = [line.strip() for line in content.splitlines() if "proxy_read_timeout" in line]
                send_timeouts = [line.strip() for line in content.splitlines() if "proxy_send_timeout" in line]
                print(f"[Nginx] {path} proxy_read_timeout: {read_timeouts}")
                print(f"[Nginx] {path} proxy_send_timeout: {send_timeouts}")
                audits[path] = {"read": read_timeouts, "send": send_timeouts}
            except Exception as e:
                print(f"[Nginx] Error reading {path}: {e}")
                audits[path] = {"error": str(e)}
        else:
            print(f"[Nginx] Not found: {path}")
    return audits

async def main():
    print("====================================================")
    print("      Open GENAI Image Generation Diagnostic Tool   ")
    print("====================================================\n")

    # Load custom env
    load_dot_env()
    print("")

    # ----------------------------------------------------
    # Phase 1: Environment Auditing
    # ----------------------------------------------------
    print("--- Phase 1: Environment Auditing ---")
    vars_to_check = [
        "IMAGE_PROVIDER",
        "ALLOW_CLOUD_API",
        "SD_API_URL",
        "LITELLM_IMAGE_URL",
        "IMAGE_API_URL",
        "S3_ENDPOINT_URL",
        "S3_PUBLIC_ENDPOINT"
    ]
    env_snapshot = {}
    for var in vars_to_check:
        val = os.environ.get(var)
        print(f"  {var}: {repr(val)}")
        env_snapshot[var] = val
    print("")

    # ----------------------------------------------------
    # Phase 2: Core Logic Integration Check
    # ----------------------------------------------------
    print("--- Phase 2: Core Logic Integration Check ---")
    try:
        from app import image_gen
        from app import objstore

        # Reloading image_gen to pick up loaded environment variables
        import importlib
        importlib.reload(image_gen)
        importlib.reload(objstore)

        effective_provider = image_gen.get_effective_provider()
        print(f"  [image_gen] get_effective_provider(): {repr(effective_provider)}")
        print(f"  [image_gen] ALLOW_CLOUD_API parsed: {image_gen.ALLOW_CLOUD_API}")
        print(f"  [image_gen] SD_API_URL parsed: {image_gen.SD_API_URL}")

        is_up = await image_gen.is_sd_up()
        print(f"  [image_gen] is_sd_up() status: {is_up}")

        objstore_configured = objstore.is_configured()
        print(f"  [objstore] is_configured() status: {objstore_configured}")
        print(f"  [objstore] S3_PUBLIC_ENDPOINT: {objstore.S3_PUBLIC_ENDPOINT}")
        print(f"  [objstore] S3_ENDPOINT_URL: {objstore.S3_ENDPOINT_URL}")
    except Exception as e:
        import traceback
        print("  [Error] Failed to load/execute backend logic modules:")
        traceback.print_exc()
    print("")

    # ----------------------------------------------------
    # Phase 3: Isolated Components Connectivity Testing
    # ----------------------------------------------------
    print("--- Phase 3: Isolated Components Connectivity Testing ---")
    # URLs from backend or environment
    sd_url = os.environ.get("SD_API_URL", "http://host.docker.internal:7860")
    local_sd_api_url = os.environ.get("IMAGE_API_URL", "http://local-sd-api:8000/v1/images/generations")
    litellm_url = os.environ.get("LITELLM_IMAGE_URL", "http://litellm:4000/v1")
    seaweed_url = os.environ.get("S3_ENDPOINT_URL", "http://seaweedfs:8333")

    # Extract base/health urls
    from urllib.parse import urlparse

    def get_base_url(url_str):
        try:
            parsed = urlparse(url_str)
            return f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            return url_str

    sd_base = get_base_url(sd_url)
    local_sd_api_base = get_base_url(local_sd_api_url)
    litellm_base = get_base_url(litellm_url)
    seaweed_base = get_base_url(seaweed_url)

    # Execute tests
    await test_endpoint("Stable Diffusion SD_API_URL", f"{sd_base}/sdapi/v1/sd-models", timeout=3.0)
    await test_endpoint("local-sd-api IMAGE_API_URL", f"{local_sd_api_base}/health", timeout=3.0)
    await test_endpoint("LiteLLM LITELLM_IMAGE_URL", f"{litellm_base}/health", timeout=3.0)
    await test_endpoint("SeaweedFS S3_ENDPOINT_URL", seaweed_base, timeout=3.0)
    print("")

    # ----------------------------------------------------
    # Phase 4: Proxy and System Configurations Audit
    # ----------------------------------------------------
    print("--- Phase 4: Proxy and System Configurations Audit ---")
    gpu_ok, gpu_msg = check_nvidia_smi()
    nginx_audits = check_nginx_conf()
    print("")

    print("====================================================")
    print("               Diagnostics Complete                 ")
    print("====================================================")

if __name__ == "__main__":
    asyncio.run(main())
