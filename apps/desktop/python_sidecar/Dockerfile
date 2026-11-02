# SpriteCut AI engine on Cloud Run GPU (NVIDIA L4/T4).
#   docker build -t spritecut-engine apps/desktop/python_sidecar
#   gcloud run deploy spritecut-engine --image ... --gpu 1 --gpu-type nvidia-l4 --cpu 4 --memory 16Gi --no-allow-unauthenticated
# Point the web service's AI_ENGINE_URL at this service.

FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 \
    SPRITECUT_MODELS_DIR=/models U2NET_HOME=/models
RUN apt-get update && apt-get install -y --no-install-recommends python3.11 python3.11-venv python3-pip libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && python3.11 -m venv /venv
ENV PATH=/venv/bin:$PATH
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt onnxruntime-gpu==1.20.*
COPY sidecar_server.py model_loader.py pipeline.py ./
# Bake the models into the image so cold starts do not download ~1.4 GB.
RUN python -c "from rembg import new_session; [new_session(m) for m in ('birefnet-general','birefnet-general-lite','isnet-anime')]"
EXPOSE 8080
CMD ["python", "sidecar_server.py", "--host", "0.0.0.0", "--port", "8080", "--preload"]
