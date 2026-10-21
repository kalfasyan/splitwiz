# Installing Splitwiz without technical knowledge

This guide is for you if words like "Docker", "server" or "terminal" mean nothing to you. You don't need to learn them. You'll click through a few programs, copy and paste one line, and end up with Splitwiz on both of your phones, with all your data kept on a computer in your own home.

## What you need to know first

Splitwiz is not an app from the App Store. It's a small program that runs on **a computer in your home**, and both of your phones talk to it. Your expenses never leave that computer.

You need:

- **A Windows PC or a Mac that can stay on all the time.** If it goes to sleep, Splitwiz stops until it wakes up, so turn sleep off in its power settings. An old laptop that stays plugged in is perfect.
- **About 30 minutes.** Do it in one sitting: until the two of you are added in step 4, anyone on your home network who opens the address could add themselves instead.

It's free, apart from the electricity.

Already have a Synology NAS? Use the [Synology guide](synology.md) instead.

---

## 1. Install Docker Desktop

Docker Desktop is a free program that runs Splitwiz for you. Download it from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/), install it like any other program, and open it. You can skip signing in.

In its settings (the gear icon), turn on **Start Docker Desktop when you sign in to your computer**, so Splitwiz comes back after a restart.

## 2. Make a folder for your data

Create a folder where Splitwiz will keep your expenses, for example `Documents\Splitwiz` on Windows or `Documents/Splitwiz` on a Mac. Don't delete it: it is your Splitwiz data.

## 3. Start Splitwiz

1. In Docker Desktop, click the search bar at the top and type `ghcr.io/kalfasyan/splitwiz`.
2. Pick it and click **Run**.
3. Click **Optional settings** and fill in:
   - **Container name**: `splitwiz`
   - **Host port**: `8090`
   - **Volumes**: for **Host path**, click the `…` button and pick the folder from step 2. For **Container path**, type `/app/pb_data`.
   - **Environment variables**: variable `TZ`, value your time zone, for example `Europe/Brussels` (find yours in the "TZ identifier" column of [this list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List)).
4. Click **Run**.

## 4. Add the two of you

On the same computer, open [http://localhost:8090](http://localhost:8090) in your browser. You'll see a setup screen: fill in a name, email address and password for each of you. These are the only two accounts Splitwiz will ever have.

## 5. Get a secure address with Tailscale

Phones only allow installing Splitwiz as an app and getting notifications from a secure (`https://`) address. The free [Tailscale](https://tailscale.com) app gives you one, and it also lets your phones reach Splitwiz when you're away from home, without anyone else being able to.

Tailscale only connects your devices to each other. Your expenses travel encrypted between your phones and your computer: Tailscale can't read them and doesn't store them.

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

## 6. Put it on your phones

Do this on each phone:

1. Open your Splitwiz address (from step 5) in the phone's browser and sign in.
2. Add it to the home screen:
   - **iPhone**: in Safari, tap the **Share** button, then **Add to Home Screen**.
   - **Android**: in Chrome, tap **⋮**, then **Install app** (or **Add to Home screen**).
3. Open Splitwiz from its new icon. To get notifications when the other person adds an expense, go to **Settings > Notifications** in Splitwiz and turn them on.

That's it. Enjoy not arguing about money.

## Updating

In Docker Desktop, open **Images**, find `ghcr.io/kalfasyan/splitwiz` and pull the newest version (the `⋮` menu > **Pull**). Then, under **Containers**, delete the `splitwiz` container and do step 3 again with the same folder. Your data is in the folder, so nothing is lost.

## Keeping your data safe

- Splitwiz makes a backup by itself every evening and keeps the last 7, inside the folder from step 2.
- If that computer's disk breaks, those backups go with it. So once in a while, copy the whole folder from step 2 to a USB stick or another computer at home.
- **Settings > Export all data (CSV)** in Splitwiz gives you a copy that opens in Excel or another spreadsheet program.

## Something went wrong?

- **The page doesn't load**: wait a minute and try again. Check that the computer is on and that Docker Desktop shows `splitwiz` as running (a green dot).
- **There is no "Add to Home Screen" or "Install app"**: make sure the address starts with `https://`.
- **Stuck?** [Open an issue](https://github.com/kalfasyan/splitwiz/issues) and describe what you see; a screenshot helps.
