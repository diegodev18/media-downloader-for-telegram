
# Media Downloader for Telegram

A Telegram bot that allows users to download media from various social networks by simply sending a link. The bot supports multiple platforms and provides an easy-to-use interface for downloading content directly within Telegram.

## Features

- Download videos from popular social media platforms.
- Simple and intuitive commands.
- Supports various video formats and qualities.
- Built with TypeScript and Telegraf.

## Installation for Development

1. Clone the repository:

   ```bash
   git clone https://github.com/diegodev18/media-downloader-for-telegram.git
   ```

2. Navigate to the project directory:

   ```bash
   cd media-downloader-for-telegram
   ```

3. Install the dependencies:

   ```bash
   pnpm install
   ```

   if you don't have `pnpm` installed, you can install it globally using:

   ```bash
   npm install -g pnpm
   ```

4. Set up your Telegram bot token and YouTube cookies in a `.env` file:

   ```bash
   BOT_TOKEN="<your_bot_token>"
   COOKIES="<your_youtube_cookies>"
   ```

5. Start the bot:

   ```bash
   pnpm run dev
   ```

## Installation for Production

1. Clone the repository:

   ```bash
   git clone https://github.com/diegodev18/media-downloader-for-telegram.git
   ```

2. Navigate to the project directory:

   ```bash
   cd media-downloader-for-telegram
   ```

3. Build docker image:

   ```bash
   docker build -t media-downloader-for-telegram .
   ```

4. Run the bot:

   ```bash
   docker run -d --name media-downloader-for-telegram -e BOT_TOKEN="<your_bot_token>" -e COOKIES="<your_youtube_cookies>" media-downloader-for-telegram
   ```

## Usage

- Send a link to a media file to the bot.
- Use the `/help` command to see a list of available commands.
- Enjoy downloading media directly within Telegram!

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
