# Installing Splitwiz without technical knowledge

This guide is for you if words like "Docker", "server" or "terminal" mean nothing to you. You don't need to learn them. You'll click through a few web pages, copy and paste a few lines, and end up with Splitwiz on both of your phones.

## What you need to know first

Splitwiz is not an app from the App Store. It's a small program that has to run somewhere **all the time**, so both of your phones can talk to it. You have two choices for where it runs:

| | **A. Rent a small online server** (recommended) | **B. Use a computer at home** |
| --- | --- | --- |
| Effort | About 15 minutes, all in your web browser | About 30 minutes |
| Cost | About $5 per month | Free, plus the electricity |
| Works away from home | Yes | Yes, after installing one extra app on each phone |
| Needs a computer that's always on | No | Yes, it must stay switched on and awake |

Already have a Synology NAS? Use the [Synology guide](synology.md) instead.

Whichever you choose, **set it up in one sitting**. Until the two of you are added (step A6 or B4), anyone who finds the address could add themselves instead.

---

## Option A: Rent a small online server

This uses [Railway](https://railway.com), a service that runs programs like Splitwiz for you and gives you a secure web address. Other similar services work too, but the steps below are for Railway.

### A1. Create an account

Go to [railway.com](https://railway.com) and sign up. You'll need to pick the **Hobby** plan (about $5 per month) and add a payment card, because the free trial ends and Splitwiz needs to keep running.

### A2. Start Splitwiz

1. Click **New Project**.
2. Choose **Docker Image**.
3. Paste this and press Enter:

   ```
   ghcr.io/kalfasyan/splitwiz:latest
   ```

A box called **splitwiz** appears. Click it to open its settings.

### A3. Give it somewhere to keep your data

Without this step, your expenses would be wiped every time Splitwiz restarts.

1. Right-click the empty space next to the **splitwiz** box (or use the **+ Create** button) and choose **Volume**.
2. When it asks which service to attach it to, pick **splitwiz**.
3. For the **mount path**, paste:

   ```
   /app/pb_data
   ```

### A4. Set your time zone

Open the **splitwiz** box, go to **Variables**, and add a new variable:

- Name: `TZ`
- Value: your time zone, for example `Europe/Brussels`, `Europe/London` or `America/New_York`. You can find yours in the "TZ identifier" column of [this list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List).

This makes repeating expenses and backups happen at the right time of day.

### A5. Get your web address

In the **splitwiz** box, go to **Settings**, find **Networking** and click **Generate Domain**. If it asks for a port, type `8090`.

You get an address like `https://splitwiz-production-1234.up.railway.app`. Write it down: this is your Splitwiz from now on.

Click **Deploy** (or **Apply changes**) if Railway shows such a button, and wait a minute until the box says it's running.

### A6. Add the two of you

Open your address in a web browser **right away**. You'll see a setup screen: fill in a name, email address and password for each of you. These are the only two accounts Splitwiz will ever have.

Now jump to [Put it on your phones](#put-it-on-your-phones).

### Updating (Option A)

Open the **splitwiz** box in Railway and choose **Redeploy** from its menu. Railway downloads the newest Splitwiz, and your data stays where it is.

---

## Option B: Use a computer at home

Use a Windows PC or a Mac that can stay on all the time. If it goes to sleep, Splitwiz stops until it wakes up, so turn sleep off in its power settings.

### B1. Install Docker Desktop

Docker Desktop is a free program that runs Splitwiz for you. Download it from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/), install it like any other program, and open it. You can skip signing in.

In its settings (the gear icon), turn on **Start Docker Desktop when you sign in to your computer**, so Splitwiz comes back after a restart.

### B2. Make a folder for your data

Create a folder where Splitwiz will keep your expenses, for example `Documents\Splitwiz` on Windows or `Documents/Splitwiz` on a Mac. Don't delete it: it is your Splitwiz data.

### B3. Start Splitwiz

1. In Docker Desktop, click the search bar at the top and type `ghcr.io/kalfasyan/splitwiz`.
2. Pick it and click **Run**.
3. Click **Optional settings** and fill in:
   - **Container name**: `splitwiz`
   - **Host port**: `8090`
   - **Volumes**: for **Host path**, click the `…` button and pick the folder from B2. For **Container path**, type `/app/pb_data`.
   - **Environment variables**: variable `TZ`, value your time zone, for example `Europe/Brussels` (find yours in the "TZ identifier" column of [this list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List)).
4. Click **Run**.

### B4. Add the two of you

On the same computer, open [http://localhost:8090](http://localhost:8090) in your browser. You'll see a setup screen: fill in a name, email address and password for each of you. These are the only two accounts Splitwiz will ever have.

### B5. Get a secure address with Tailscale

Phones only allow installing Splitwiz as an app and getting notifications from a secure (`https://`) address. The free [Tailscale](https://tailscale.com) app gives you one, and it also lets your phones reach Splitwiz when you're away from home, without anyone else being able to.

1. Install Tailscale on the computer from [tailscale.com/download](https://tailscale.com/download) and sign in (a Google, Microsoft or Apple account works).
2. Install the **Tailscale** app on **both phones** from the App Store or Google Play, and sign in with **the same account**. The second person can instead be invited from the Tailscale website under **Users > Invite users**.
3. On the Tailscale website, open **DNS** and make sure **MagicDNS** is on, then scroll down and click **Enable HTTPS**.
4. On the computer, open a command window: on Windows, press the Windows key, type `cmd` and press Enter. On a Mac, press Cmd+Space, type `Terminal` and press Enter. Paste this line and press Enter:

   ```
   tailscale serve --bg 8090
   ```

   On a Mac, if it says the command isn't found, use this instead:

   ```
   /Applications/Tailscale.app/Contents/MacOS/Tailscale serve --bg 8090
   ```

   It prints an address like `https://my-computer.tail1234.ts.net`. Write it down: this is your Splitwiz from now on. You can close the window.

### Updating (Option B)

In Docker Desktop, open **Images**, find `ghcr.io/kalfasyan/splitwiz` and pull the newest version (the `⋮` menu > **Pull**). Then, under **Containers**, delete the `splitwiz` container and do step B3 again with the same folder. Your data is in the folder, so nothing is lost.

---

## Put it on your phones

Do this on each phone:

1. Open your Splitwiz address (from step A5 or B5) in the phone's browser and sign in.
2. Add it to the home screen:
   - **iPhone**: in Safari, tap the **Share** button, then **Add to Home Screen**.
   - **Android**: in Chrome, tap **⋮**, then **Install app** (or **Add to Home screen**).
3. Open Splitwiz from its new icon. To get notifications when the other person adds an expense, go to **Settings > Notifications** in Splitwiz and turn them on.

That's it. Enjoy not arguing about money.

## Keeping your data safe

- Splitwiz makes a backup by itself every evening and keeps the last 7.
- Once in a while, go to **Settings > Export all data (CSV)** in Splitwiz and keep the file somewhere safe, such as your email or cloud storage. It opens in Excel or Google Sheets.

## Something went wrong?

- **The page doesn't load**: wait a minute and try again. On Option B, check that the computer is on and that Docker Desktop shows `splitwiz` as running (a green dot).
- **There is no "Add to Home Screen" or "Install app"**: make sure the address starts with `https://`.
- **Stuck?** [Open an issue](https://github.com/kalfasyan/splitwiz/issues) and describe what you see; a screenshot helps.
