```bash
yarn install
yarn dev
```

открыть http://localhost:5173/ в браузере

## Чтобы получить токен используем команду:

```bash
curl https://ivanivanshumshumilov.amocrm.ru/oauth2/access_token -d \
'{"client_id":"<Id интеграции>","client_secret":"<Секретный ключ>","grant_type":"authorization_code","code":"<Код авторизации>","redirect_uri":"https://ivanivanshumshumilov.amocrm.ru/"}' \
-H 'Content-Type:application/json' \
-X POST
```

## Личные заметки

Токены лежат в .env в репозитории. Если ACCESSTOKEN протух, то можно воспользоваться рефрешем, ну или передернуть интеграцию и получить заново
Хранить в репе не стоит конечно, но для теста можно.
В принципе можно сделать и долгоживущий токен, но так обычно лучше, чтобы избежать утечки.
