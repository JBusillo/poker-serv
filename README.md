# poker-serv

This is a work in progress. I'm developing a poker SPA and server so that my poker group (in Cuenca Ecuador) can play poker remotely during the COVID-19 lockdown.

I started writing the server using **express**, but now it's just a node.js server, since it only uses Socket.Io to communicate with the SPA client.

SPA client code is under jbusillo/poker-svelte

There is a lot of refactoring that can be done -- at this time, I'm coding my the seat of my pants.

This is quite a learning curve for me. Coming from a Microsoft environment (.net, C#, SqlServer), just about everything is a challenge:

- Javascript -- especially promises, async/await (trying to keep myself out callback hell)
- Socket.Io

I'm retired, so this is more of a hobby or mental exercise.

There's a lot of debugging to do -- I'm also using puppeteer for multi-player testing -- another challenge.
