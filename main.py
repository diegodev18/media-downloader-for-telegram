from yt_dlp import YoutubeDL


def main():
    # Proporcionar la URL del video de YouTube
    video_url = input("Ingresa la URL del video de YouTube: ")

    # Configuración para descargar el video
    ydl_opts = {
        'format': 'best',  # Descargar el mejor formato disponible
        'outtmpl': 'output.%(ext)s',  # Guardar con el título del video
    }

    try:
        with YoutubeDL(ydl_opts) as ydl:
            print("[download] Iniciando descarga...")
            ydl.download([video_url])
            print("[download] ¡Descarga completada!")
    except Exception as e:
        print(f"Ocurrió un error: {e}")



if __name__ == '__main__':
    main()
    