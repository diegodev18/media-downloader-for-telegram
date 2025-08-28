FROM python:alpine3.21

WORKDIR /app

COPY . /app/

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]