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
      name: "frente6-escudo-reclamos",
      script: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\daemon_frente6_reclamos.py",
      interpreter: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario\\.venv\\Scripts\\python.exe",
      cwd: "c:\\Users\\sidha\\OneDrive\\Careta para Antigravity\\Fuentes_OLLIN\\servidor_secundario",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        PYTHONUNBUFFERED: "1",
        FRENTE6_PORT: "8088",
        FRENTE6_HOST: "0.0.0.0"
      }
    }
  ]
};
