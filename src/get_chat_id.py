from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes
from os import environ, remove, makedirs, path
from dotenv import load_dotenv
from telegram import Bot
from yt_dlp import YoutubeDL
from asyncio import sleep as asyncio_sleep
from time import sleep

load_dotenv()
BOT_TOKEN = environ.get("BOT_TOKEN")

app = ApplicationBuilder().token(BOT_TOKEN).build()

# Función para manejar mensajes en un chat específico
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # await bot.send_message(chat_id=CHAT_ID, text="El bot está escuchando mensajes...")
    NOW_CHAT_ID = update.effective_chat.id
    
    # Filtrar mensajes del chat específico
    if str(NOW_CHAT_ID):
        user = update.effective_user.first_name
        message = update.message.text
        
        if 'start' in message.lower():
            print(f"Mensaje de inicio recibido de {user} en el chat {NOW_CHAT_ID}")


if __name__ == '__main__':
    # Manejar mensajes
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    print("El bot está escuchando mensajes...")
    app.run_polling()
