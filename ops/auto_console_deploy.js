// auto_console_deploy.js - Автоматический скрипт для консоли хостинга
// Этот скрипт можно вставить в консоль браузера на странице хостинга

const commands = [
    "cd /tmp",
    "wget https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -O project.zip || curl -L https://github.com/offflinerpsy/deep-components-aggregator/archive/refs/heads/main.zip -o project.zip",
    "unzip -o project.zip",
    "pkill -f node || true",
    "rm -rf /opt/deep-agg/*",
    "mkdir -p /opt/deep-agg",
    "cp -r deep-components-aggregator-main/* /opt/deep-agg/",
    "cd /opt/deep-agg",
    "npm install --production",
    "nohup node server.js > server.log 2>&1 &",
    "sleep 5",
    "curl http://127.0.0.1:9201/api/search?q=LM317",
    "echo 'Deployment completed!'"
];

console.log("🚀 АВТОМАТИЧЕСКИЙ ДЕПЛОЙ ЧЕРЕЗ КОНСОЛЬ ХОСТИНГА");
console.log("Скопируй и вставь эти команды в консоль Ubuntu:");
console.log("");

commands.forEach((cmd, i) => {
    console.log(`${i+1}. ${cmd}`);
});

console.log("");
console.log("Или скопируй весь блок одной командой:");
console.log("");
console.log(commands.join(" && "));

// Функция для автоматической вставки команд (если поддерживается)
function autoExecute() {
    const terminal = document.querySelector('input[type="text"], textarea, .terminal-input');
    if (terminal) {
        commands.forEach((cmd, i) => {
            setTimeout(() => {
                terminal.value = cmd;
                terminal.dispatchEvent(new Event('input'));
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13
                });
                terminal.dispatchEvent(enterEvent);
                console.log(`Executed: ${cmd}`);
            }, i * 3000); // 3 секунды между командами
        });
    } else {
        console.log("Терминал не найден, выполни команды вручную");
    }
}

console.log("Для автоматического выполнения запусти: autoExecute()");
