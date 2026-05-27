import socket
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')


DUMP_FILE = r"E:\ROXY_SYSTEM\Projects\Antigravity-Swarm\rave_full_history.md"
UDP_IP = "127.0.0.1"
UDP_PORT = 8888

def inject_trades():
    import re
    trades = []
    try:
        with open(DUMP_FILE, "r", encoding="utf-8") as f:
            content = f.read()
            
        blocks = content.split("### [")[1:]
        for b in blocks:
            # Парсим PnL
            pnl_match = re.search(r"PnL:\s*(-?\d+\.\d+)", b)
            pnl = float(pnl_match.group(1)) if pnl_match else 0.0
            
            trades.append({
                "symbol": "RAVEUSDT",
                "pnl": pnl
            })
    except Exception as e:
        print(f"File error: {e}")
        return

    # Отправляем 100 сделок
    # Так как в логе сделки идут от новых к старым, мы перевернем их, чтобы демону казалось, что это живая торговля.
    trades.reverse()
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    print(f"🔥 [INJECTOR] Выстреливаем {len(trades)} сделок по UDP в Память V10 (порт {UDP_PORT})...")
    
    for t in trades:
        msg = json.dumps(t).encode('utf-8')
        sock.sendto(msg, (UDP_IP, UDP_PORT))
        time.sleep(0.01) # Микро-задержка
        
    print("✅ [INJECTOR] Историческая ინъекция завершена. Демон V10 должен был проглотить и поставить блок.")

if __name__ == "__main__":
    inject_trades()
