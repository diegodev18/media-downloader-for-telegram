export type SupportNetwork = {
  name: string;
  urls: string[];
};

export type Command = {
  description: string;
  action: (ctx: Context) => void;
};
