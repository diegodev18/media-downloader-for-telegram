export type SupportNetwork = {
  id: string;
  name: string;
  urls: string[];
};

export type Command = {
  description: string;
  action: (ctx: Context) => void;
};
