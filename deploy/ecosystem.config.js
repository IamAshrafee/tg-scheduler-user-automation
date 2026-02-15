module.exports = {
    apps: [
        {
            name: "tg-backend",
            cwd: "/var/www/tg-scheduler-user-automation/backend",
            script: "/var/www/tg-scheduler-user-automation/venv/bin/uvicorn",
            args: "app.main:app --host 127.0.0.1 --port 8000",
            interpreter: "none",
            env: {
                PATH: "/var/www/tg-scheduler-user-automation/venv/bin:" + process.env.PATH,
            },
            max_restarts: 10,
            restart_delay: 5000,
            error_file: "/var/www/tg-scheduler-user-automation/logs/backend-error.log",
            out_file: "/var/www/tg-scheduler-user-automation/logs/backend-out.log",
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
        },
    ],
};
