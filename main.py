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
COOKIES_CONTENT = environ.get("COOKIES")

with open("cookies.txt", "w") as f:
    f.write(COOKIES_CONTENT)
f.close()

vid_path = path.join('temp', 'output.mp4')

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN o CHAT_ID no están configurados correctamente en el archivo .env")

app = ApplicationBuilder().token(BOT_TOKEN).build()

# Función para manejar mensajes en un chat específico
async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    bot = Bot(BOT_TOKEN)
    # await bot.send_message(chat_id=CHAT_ID, text="El bot está escuchando mensajes...")
    NOW_CHAT_ID = update.effective_chat.id
    
    downloaded = False
    
    # Filtrar mensajes del chat específico
    if str(NOW_CHAT_ID):
        user = update.effective_user.first_name
        message = update.message.text
        print(f"Mensaje recibido de {user} en el chat {NOW_CHAT_ID}: {message}")
        
        if 'https://www.youtube.com/' in message or'https://youtu.be/' in message or 'https://www.facebook.com/' in message or 'https://youtube.com/' in message:
            print("Se ha detectado un enlace de YouTube")
            video_url = message
            ydl_opts = {
                'format': 'bestvideo+bestaudio/best',  # Descargar el mejor formato disponible
                'merge_output_format': 'mp4',
                'outtmpl': path.join('temp', 'output.%(ext)s'),  # Guardar con el título del video
                'cookiefile': path.join('temp', 'cookies.txt'),
            }
            try:
                makedirs('temp', exist_ok=True)
                print('Enviando video...')
                
                with YoutubeDL(ydl_opts) as ydl:
                    await bot.send_message(NOW_CHAT_ID, "Iniciando descarga...")
                    print("[download] Iniciando descarga...")
                    ydl.download([video_url])
                    await bot.send_message(NOW_CHAT_ID, "Descarga finalizada...")
                    print("[download] ¡Descarga completada!")
                    downloaded = True
                    
                    await bot.send_message(NOW_CHAT_ID, "Enviando video...")
                    with open(vid_path, 'rb') as video:
                        await bot.send_video(NOW_CHAT_ID, video=video)
                        # await asyncio_sleep(30)
                    
                ydl_opts_quiet = { 'quiet': True }
                with YoutubeDL(ydl_opts_quiet) as ydl_quiet:
                    info = ydl_quiet.extract_info(video_url, download=False, process=False, force_generic_extractor=False)
                    
                await bot.send_message(NOW_CHAT_ID, f"Video \"{info['title']}\" enviado!")
                print(f"Video {info['title']} enviado!")
                    
            except Exception as e:
                print(f"Ocurrió un error: {e}")
                await bot.send_message(NOW_CHAT_ID, f"Ocurrió un error: {e}")
                
            if downloaded and path.exists(vid_path):
                print("Eliminando video...")
                downloaded = False
                remove(vid_path)
                
            print('Check \n')
            
        elif 'end' in message or 'stop' in message:
            print("El bot se detendrá")
            
            if path.exists(vid_path):
                print("Eliminando video...")
                remove(vid_path)
            
            app.stop_running()
            return


# Configuración del bot
if __name__ == '__main__':
    try:
        # Manejar mensajes
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

        print("El bot está escuchando mensajes...")
        app.run_polling()
    except KeyboardInterrupt:
        print("El bot se ha detenido")
        app.stop_running()
        
        if path.exists(vid_path):
            print("Eliminando video...")
            remove(vid_path)
