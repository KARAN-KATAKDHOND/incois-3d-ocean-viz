FROM python:3.11-slim

WORKDIR /app

# System deps for HDF5/NetCDF4
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev \
    libnetcdf-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

# Default: run the pipeline trigger API
# Override with celery worker command for worker mode
CMD ["uvicorn", "pipeline.main:app", "--host", "0.0.0.0", "--port", "8001"]
