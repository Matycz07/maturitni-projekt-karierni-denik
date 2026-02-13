# maturitni-projekt-karierni-denik
Maturitní projekt kariérní deník. Pro snažší předávaní informací pro studenty.

# INSTALACE
Stahněte tady celý program

Dále jak už to máme stažené, půjdeme do složky /server, kde v souboru admin.txt nastavíme Gmail, na který bude definován administrátor. Budeme muset přidat soubor .env.local, bez něj to nepůjde. Abychom mohli vyplnit informace v .env.local, musíme se registrovat/přihlásit do Google Cloudu, kde musíme vytvořit projekt. Musíme se dostat do APIs & Services, kde přejdeme do Credentials a tam vytvoříme OAuth client ID. Vyplníme údaje a musíme se rozhodnout, jestli to chceme v localhostu nebo na DNS – ono je to ve výsledku podobný, ale kvůli takovýhle věci to nemusí jet.
Do Authorized JavaScript origins dáme buď https://domena.cz např. (https://kariernidenik.fun), nebo http://localhost:6601
A do Authorized redirect URIs dáme buď https://domena.cz/auth/google/callback např. (https://kariernidenik.fun/auth/google/callback), nebo http://localhost:6601/auth/google/callback
Použil jsem verzi pro kariérní deník, ale když dáme localhost, tak to můžeme spustit lokálně.




Zkopírujeme Client Secret a Client ID a v .env.local to zapíšeme nějak takhle:
CLIENT_ID=Zde se vloží Client ID
CLIENT_SECRET=Zde vložíme Client Secret
REDIRECT_URI=https://kariernidenik.fun/auth/google/callback
ALLOWED_ORIGIN=https://kariernidenik.fun
BASE_URL=https://kariernidenik.fun
SESSION_SECRET=Zde vlož svoje heslo o 50-100 znacích kvůli bezpečnosti. Heslo se nesmí nikdy sdílet, jinak se musí změnit heslo.

Pro localhost:
CLIENT_ID=Zde se vloží Client ID
CLIENT_SECRET=Zde vložíme Client Secret
REDIRECT_URI=http://localhost:6601/auth/google/callback
ALLOWED_ORIGIN=http://localhost:6601
BASE_URL=http://localhost:6601
SESSION_SECRET=Zde vlož svoje heslo o 50-100 znacích kvůli bezpečnosti. Heslo se nesmí nikdy sdílet, jinak se musí změnit heslo.

Teď budeme v části, kde se nachází Dockerfile. V části, kde se nachází /app a /server, spustíme:
docker-compose up --build -d
Docker se postaví a jede.
U serveru, kde je IP, se musí definovat doména, a potom jak pojede doména, tak ho to z IP adresy hodí na doménu a tam jede.


# DOKUMENTACE
https://docs.google.com/document/d/1JY6yGZ7Ut6eF_QkrshbzZ78kzbBYdwkfHDrMBk8OA1s/


# Spuštení DOCKERU
docker-compose up --build -d
# VYPNUTÍ DOCKERU 
docker-compose down
