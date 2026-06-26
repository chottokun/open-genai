import { BiAbacus } from 'react-icons/bi';
import { BsDiagram3 } from 'react-icons/bs';
import { FaChartGantt, FaTimeline } from 'react-icons/fa6';
import { GoChecklist } from 'react-icons/go';
import { GrCluster } from 'react-icons/gr';
import { LiaMailBulkSolid } from 'react-icons/lia';
import { PiChartPieDuotone } from 'react-icons/pi';
import { RiMindMap, RiRobot2Line } from 'react-icons/ri';
import {
  TbBrandAws,
  TbChartDots3,
  TbChartSankey,
  TbGitBranch,
  TbMathSymbols,
  TbMathXy,
  TbPackages,
  TbRoute,
} from 'react-icons/tb';
import { VscTypeHierarchy } from 'react-icons/vsc';
import type { DiagramInfo, DiagramType, MermaidDiagramType } from './types';

/** Mermaid ダイアグラムタイプと日本語名のマッピング */
export const MERMAID_DIAGRAM_TYPES: Record<MermaidDiagramType, string> = {
  flowchart: 'フローチャート',
  piechart: '円グラフ',
  mindmap: 'マインドマップ',
  quadrantchart: '4象限チャート',
  sequencediagram: 'シーケンス図',
  timeline: 'タイムライン図',
  gitgraph: 'Gitグラフ',
  erdiagram: 'ER図',
  classdiagram: 'クラス図',
  statediagram: '状態遷移図',
  xychart: 'XYチャート',
  blockdiagram: 'ブロック図',
  architecture: 'アーキテクチャ図',
  ganttchart: 'ガントチャート',
  userjourney: 'ユーザージャーニー図',
  sankeychart: 'サンキーチャート',
  requirementdiagram: '要件図',
  networkpacket: 'ネットワークパケット図',
} as const;

export const DIAGRAM_DATA: Record<DiagramType, DiagramInfo> = {
  AI: {
    id: 'AI',
    icon: RiRobot2Line,
    title: 'AI',
    description: 'AIが最適な図を選択',
    example: {
      title: 'AIによる図の生成の例',
      content: '会社の一般的な経費生産フローを色つきで図示してください。',
    },
    category: 'main',
  },
  flowchart: {
    id: 'flowchart',
    icon: VscTypeHierarchy,
    title: 'フローチャート',
    description: 'プロセスの流れを視覚化',
    example: {
      title: 'フローチャートの例',
      content: `朝の準備の流れをフローチャートで表現したいです。以下の手順を含めてください: 
目覚める、ベッドから出る、顔を洗う、歯を磨く、朝食を食べる、服を着替える、家を出る、

途中で「時間に余裕があるか？」という判断ポイントを入れ、余裕がある場合は「コーヒーを飲む」というステップを追加してください。
時間に余裕がない場合は、そのまま「家を出る」に進むようにしてください。

簡潔で見やすいデザインの図にしてください。`,
    },
    category: 'main',
  },
  piechart: {
    id: 'piechart',
    icon: PiChartPieDuotone,
    title: '円グラフ',
    description: 'データの割合を表示',
    example: {
      title: '円グラフの例',
      content: `東京都内の20代、30代の通勤・通学手段の割合を示す円グラフを作成したいです。

電車、自転車、徒歩、車、バスの5つの手段について、それぞれの割合を適当に設定してください。
グラフのタイトルは「東京都内20-30代の通勤・通学手段」としてください。`,
    },
    category: 'main',
  },
  mindmap: {
    id: 'mindmap',
    icon: RiMindMap,
    title: 'マインドマップ',
    description: 'アイデアや概念を放射状に整理',
    example: {
      title: 'マインドマップの例',
      content:
        '生成AIのユースケースについて、様々なアイデアを考えてマインドマップで図示してください。',
    },
    category: 'main',
  },
  quadrantchart: {
    id: 'quadrantchart',
    icon: TbMathSymbols,
    title: '4象限チャート',
    description: '項目を4つの領域に分類して表示',
    example: {
      title: '4象限チャートの例',
      content: `ソーシャルメディアプラットフォームの特性を比較する4象限チャートを作成してください。
タイトルは「ソーシャルメディアプラットフォーム分析」。 
X軸は「テキスト中心」から「視覚中心」へと変化し、
Y軸は「プロフェッショナル」から「カジュアル」へと変化する。

各象限には以下のようにラベルを付けてください: 
右上の象限: 「視覚的カジュアル」
左上の象限: 「テキスト的カジュアル」
左下の象限: 「テキスト的プロフェッショナル」
右下の象限: 「視覚的プロフェッショナル」

次のソーシャルメディアプラットフォームをチャート上にプロットしてください:
Twitter: テキスト寄りでややカジュアル、
Instagram: 非常に視覚的でかなりカジュアル、
LinkedIn: テキスト寄りで非常にプロフェッショナル、
TikTok: 非常に視覚的で最もカジュアル、
Facebook: X軸とY軸の中間あたり。 

可能であれば、各プラットフォームを異なる色で表示してください。`,
    },
    category: 'other',
  },
  sequencediagram: {
    id: 'sequencediagram',
    icon: BiAbacus,
    title: 'シーケンス図',
    description: 'オブジェクト間の相互作用を時系列で表現',
    example: {
      title: 'シーケンス図の例',
      content: `Webアプリケーションで、ユーザーがログインボタンを押してから認証が完了するまでの流れを示してください。

フロントエンド、認証サーバー、データベースの3つのコンポーネントが関係します。`,
    },
    category: 'other',
  },
  timeline: {
    id: 'timeline',
    icon: FaTimeline,
    title: 'タイムライン図',
    description: '出来事を時系列で表示',
    example: {
      title: 'タイムライン図の例',
      content: `2000年から2020年までのソーシャルメディアの主要な進化と転換点をタイムラインで表現してください。
        
以下の要素を含めてください: 
ブログの普及期
写真共有プラットフォームの台頭
マイクロブログの登場
動画共有サービスの発展
モバイルファースト型SNSの広がり
ショート動画プラットフォームの台頭

各転換点について、その時期に起きた重要な技術革新や社会的変化（例: スマートフォンの普及、高速モバイルインターネットの実現など）も1-2個ずつ追記してください。`,
    },
    category: 'other',
  },
  gitgraph: {
    id: 'gitgraph',
    icon: TbGitBranch,
    title: 'Gitグラフ',
    description: 'Gitのブランチと操作の履歴を視覚化',
    example: {
      title: 'Gitグラフの例',
      content: `メインブランチから、ログイン機能とプロフィール編集機能の2つのfeatureブランチが分岐する開発フローを表現してください。

ログイン機能の開発では、フォーム実装やバリデーション追加などの複数回のコミットを行い、最終的にPull Requestでmainブランチにマージします。
一方、プロフィール編集機能の開発中には、mainブランチに加えられた最新の変更を取り込む必要が生じます。

各マージポイントでは「Reviewed and merged login feature #123」のような、コードレビューを経た実際のプロジェクトらしいコミットメッセージを含めてください。`,
    },
    category: 'other',
  },
  erdiagram: {
    id: 'erdiagram',
    icon: GrCluster,
    title: 'ER図',
    description: 'データベース設計を表現',
    example: {
      title: 'ER図の例',
      content: `ブログシステムのデータベース設計を示してください。

以下のテーブルがあり、それぞれ適切にリレーションが設定されています。:        
記事（posts）
ユーザー（users）
コメント（comments）
カテゴリー（categories）
タグ（tags）`,
    },
    category: 'other',
  },
  classdiagram: {
    id: 'classdiagram',
    icon: BsDiagram3,
    title: 'クラス図',
    description: 'クラスの構造と関係を表示',
    example: {
      title: 'クラス図の例',
      content: `ECサイトのドメインモデルを作成してください。

以下のクラスが存在します: 
User（ユーザー）
Product（商品）
Order（注文）
CartItem（カート内商品）

各クラスには適切なプロパティとメソッドを含めてください。`,
    },
    category: 'other',
  },
  statediagram: {
    id: 'statediagram',
    icon: TbChartDots3,
    title: '状態遷移図',
    description: '物の状態変化を図示',
    example: {
      title: '状態図の例',
      content: `オンラインショッピングカートの状態遷移を示してください。
「空」、「商品追加済み」、「チェックアウト中」、「支払い完了」などの状態を含めます。`,
    },
    category: 'other',
  },
  xychart: {
    id: 'xychart',
    icon: TbMathXy,
    title: 'XYチャート',
    description: '2つの変数の関係を図示',
    example: {
      title: 'XYチャートの例',
      content: `過去10年間の日本の平均睡眠時間と労働時間の関係を示すXYチャートを作成してください。

X軸を1日の平均労働時間、Y軸を1日の平均睡眠時間とし、各年のデータポイントをプロットしてください。`,
    },
    category: 'other',
  },
  blockdiagram: {
    id: 'blockdiagram',
    icon: TbPackages,
    title: 'ブロック図',
    description: 'システムの構成要素と接続を表現',
    example: {
      title: 'ブロック図の例',
      content: `スマートフォンのハードウェアコンポーネントを示すブロック図を作成してください。

以下の要素を含めます:
プロセッサ
メモリ
ストレージ
ディスプレイ
カメラ
各種センサーなど。`,
    },
    category: 'other',
  },
  architecture: {
    id: 'architecture',
    icon: TbBrandAws,
    title: 'アーキテクチャ図',
    description: 'システム全体の構造を表現',
    example: {
      title: 'アーキテクチャ図の例',
      content: `クラウドベースのWeb アプリケーションのアーキテクチャを示してください。

以下のコンポーネントを含めます:
フロントエンド
バックエンド
データベース
キャッシュ
ロードバランサー
CDNなど`,
    },
    category: 'other',
  },
  ganttchart: {
    id: 'ganttchart',
    icon: FaChartGantt,
    title: 'ガントチャート',
    description: 'プロジェクトのスケジュールを視覚化',
    example: {
      title: 'ガントチャートの例',
      content: `Webアプリケーション開発プロジェクトのスケジュールを示してください。
要件定義、設計、開発、テスト、デプロイメントの各フェーズを含めます。`,
    },
    category: 'other',
  },
  userjourney: {
    id: 'userjourney',
    icon: TbRoute,
    title: 'ユーザージャーニー図',
    description: 'ユーザー体験の流れを図示',
    example: {
      title: 'ユーザージャーニーの例',
      content: `オンラインショッピングサイトでの顧客の購買体験を示してください。

以下の流れを含めてください:
商品検索
商品閲覧
カートへの追加
チェックアウト
支払い
配送追跡`,
    },
    category: 'other',
  },
  sankeychart: {
    id: 'sankeychart',
    icon: TbChartSankey,
    title: 'サンキーチャート',
    description: 'フローの量や割合を視覚化',
    example: {
      title: 'サンキーチャートの例',
      content: `Webサイトのユーザーフローを示すサンキーチャートを作成してください。
ランディングページから始まり、各ページの遷移と離脱率を表示します。`,
    },
    category: 'other',
  },
  requirementdiagram: {
    id: 'requirementdiagram',
    icon: GoChecklist,
    title: '要件図',
    description: 'システム要件を構造化して表現',
    example: {
      title: '要求図の例',
      content: `スマートホームシステムの主要な機能要件を示してください。
照明制御、温度管理、セキュリティ、エネルギー効率化などの要件を含めます。`,
    },
    category: 'other',
  },
  networkpacket: {
    id: 'networkpacket',
    icon: LiaMailBulkSolid,
    title: 'ネットワークパケット図',
    description: 'ネットワーク通信のパケット構造を図示',
    example: {
      title: 'ネットワークパケット図の例',
      content: `HTTPリクエストパケットの構造を示す図を作成してください。
ヘッダーとボディの主要な要素を含めます。`,
    },
    category: 'other',
  },
} as const;
