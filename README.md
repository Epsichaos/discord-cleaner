# DISCORD-CLEANER

Delete every single message you ever posted to a specified discord channel. 

## Todo

- PM deletion.
- Delete every message from every chan of a specified guild.
- Delete every message that has been posted to every guilds.

## Install

```
    npm install
```

## Auth

```
    touch auth.json
```

```
{
    token: ${DISCORD_TOKEN}
}
```

DISCORD_TOKEN can be found in network pane of your browser developer tools. 

## Usage

```
    node clean.js --guild "${GUILD_NAME}" --channel "${CHANNEL_NAME}"
```

## Disclaimer 

I take no responsibility from what happens as a consequence of using this program. You will not be asked for confirmation before deletion. 