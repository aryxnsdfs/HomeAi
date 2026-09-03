module.exports = {
  apps: [
    {
      name: "home-backend",
      script: "/var/www/homeai/server.py",
      interpreter: "/var/www/homeai/venv/bin/python",
      cwd: "/var/www/homeai",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "home-celery",
      script: "/var/www/homeai/venv/bin/celery",
      interpreter: "/var/www/homeai/venv/bin/python",
      args: "-A celery_worker worker --loglevel=info --pool=solo",
      cwd: "/var/www/homeai",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "home-frontend",
      script: "npm",
      args: "run dev",
      cwd: "/var/www/homeai",
      restart_delay: 5000,
      max_restarts: 10,
    }
  ]
}
