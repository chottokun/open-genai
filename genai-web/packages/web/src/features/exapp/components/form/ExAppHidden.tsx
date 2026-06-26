import { FieldValues, UseFormRegister } from 'react-hook-form';

type Props = {
  id: string;
  register: UseFormRegister<FieldValues>;
};

export const ExAppHidden = (props: Props) => {
  const { id, register } = props;

  return <input id={id} type='hidden' {...register(id)} />;
};
