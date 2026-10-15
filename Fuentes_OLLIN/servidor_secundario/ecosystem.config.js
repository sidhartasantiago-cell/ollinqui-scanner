module.exports = {
  apps: [
    {
      name: "calpixqui-whatsapp-gateway",
      script: "gateway.js",
      cwd: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\whatsapp_gateway",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        WHATSAPP_GATEWAY_PORT: "3001"
      }
    },
    {
      name: "calpixqui-worker-fastapi",
      script: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\hermes_ollin_worker.py",
      interpreter: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\.venv\\Scripts\\python.exe",
      cwd: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        PYTHONUNBUFFERED: "1",
        HERMES_PORT: "8088",
        HERMES_HOST: "0.0.0.0"
      }
    },
    {
      name: "calpixqui-len-outbox",
      script: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\calpixqui_outbox_len.py",
      interpreter: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\.venv\\Scripts\\python.exe",
      args: ["--intervalo", "120"],
      cwd: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        PYTHONUNBUFFERED: "1"
      }
    }
  ]
};
