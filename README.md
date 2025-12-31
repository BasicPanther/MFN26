# Event Band Sales Desk with MongoDB + Netlify

Complete setup guide to deploy this app with MongoDB on Netlify.

## 📋 Files Included

```
your-project/
├── netlify.toml              # Netlify config
├── package.json              # Node.js dependencies
├── index.html                # Your HTML app
├── README.md                 # This file
└── netlify/
    └── functions/
        ├── save-entry.js     # POST: Save band entry to MongoDB
        ├── get-entries.js    # GET: Fetch entries for a user
        └── delete-entry.js   # DELETE: Remove an entry
```

## 🚀 Quick Setup (5 minutes)

### Step 1: GitHub Repository
1. Create a new GitHub repo (e.g., `event-band-sales`)
2. Clone it locally:
   ```bash
   git clone https://github.com/yourusername/event-band-sales.git
   cd event-band-sales
   ```

### Step 2: Add Files
Copy these files into your repo:
- `index.html` (your main app)
- `netlify.toml`
- `package.json`
- `netlify/functions/save-entry.js`
- `netlify/functions/get-entries.js`
- `netlify/functions/delete-entry.js`

Create the `netlify/functions/` folder manually if needed.

### Step 3: MongoDB Atlas Setup
1. Go to https://mongodb.com/atlas → Create free account
2. Create **Cluster** (M0 free tier)
3. Add **Database User**: username `eventUser`, password `YourSecurePassword123`
4. Get **Connection String** from Connect → Drivers
   - Will look like: `mongodb+srv://eventUser:YourSecurePassword123@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### Step 4: Netlify Deployment
1. Go to https://netlify.com → Sign up with GitHub
2. Click **"New site from Git"** → Select your GitHub repo
3. Deploy (takes ~2 min)

### Step 5: Add Environment Variables
In Netlify dashboard:
1. Go to **Site Settings → Environment Variables** 
2. Click **"Add a variable"** → **"Add a single variable"** for each:

   **Variable 1:**
   - Key: `MONGODB_URI`
   - Value: Your full MongoDB connection string
   - Check: ✓ Contains secret values

   **Variable 2:**
   - Key: `MONGODB_DB`
   - Value: `event_bands_db`

   **Variable 3:**
   - Key: `MONGODB_COLLECTION`
   - Value: `entries`

3. **Redeploy** your site (Netlify will trigger automatically or go to Deploy Settings → Trigger Deploy)

### Step 6: Update Your HTML
In `index.html`, find the JavaScript section and add this function at the top of the `<script>` tag:

```javascript
// MongoDB backend API calls
async function saveToMongoDB(entry) {
  try {
    const response = await fetch('/.netlify/functions/save-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        userId: currentUser  // Important: attach user ID
      })
    });
    const data = await response.json();
    if (data.success) {
      showMessage(`✓ Saved to database`, 'success');
      return true;
    } else {
      showMessage(`Error: ${data.error}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Save error:', error);
    showMessage('Could not save to database: ' + error.message, 'error');
    return false;
  }
}

async function loadFromMongoDB() {
  try {
    const response = await fetch(`/.netlify/functions/get-entries?userId=${currentUser}`);
    const data = await response.json();
    if (data.success) {
      entries[currentUser] = data.data || [];
      updateViewTab();
      showMessage(`Loaded ${data.count} entries from database`, 'success');
    }
  } catch (error) {
    console.error('Load error:', error);
    showMessage('Could not load from database', 'error');
  }
}

async function deleteFromMongoDB(mongoId) {
  try {
    const response = await fetch(`/.netlify/functions/delete-entry?id=${mongoId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      showMessage('Entry deleted from database', 'success');
      return true;
    } else {
      showMessage(`Error: ${data.error}`, 'error');
      return false;
    }
  } catch (error) {
    console.error('Delete error:', error);
    showMessage('Could not delete from database', 'error');
    return false;
  }
}
```

Then modify the `addEntry()` function:
- After the entry is created, call: `await saveToMongoDB(entry);`
- Save the MongoDB `_id` returned in the entry object

And modify `deleteEntry()`:
- When deleting, call: `await deleteFromMongoDB(entry._id);`

### Step 7: Test
1. Open your Netlify URL (e.g., `https://event-band-sales.netlify.app`)
2. Add an entry
3. Check **View Data** tab → should show entry
4. Go to **MongoDB Atlas** → Collections → Should see your data appear in real-time

## 🔄 How It Works

- **Save**: Form → Netlify Function → MongoDB
- **Load**: Page load → Netlify Function → MongoDB → Display
- **Delete**: Delete button → Netlify Function → MongoDB
- **Multi-device**: All devices fetch latest data from MongoDB in real-time

## 📝 Important Notes

- **First deploy takes 2-5 min** (npm install happens)
- **Environment variables**: Must redeploy after adding them
- **MongoDB connection strings**: Keep secret, always use Netlify env vars
- **LocalStorage fallback**: Current app still uses localStorage if MongoDB isn't configured

## 🐛 Troubleshooting

**"Function not found" error?**
- Check file names: must be exactly `save-entry.js`, `get-entries.js`, `delete-entry.js`
- Files must be in `netlify/functions/` folder
- Run redeploy

**"MongoDB connection error"?**
- Check env variables are set correctly in Netlify
- Verify MongoDB connection string (copy from Atlas again)
- Make sure IP whitelist includes `0.0.0.0/0` in MongoDB Atlas

**Data not syncing?**
- Check browser console (F12) for errors
- Check Netlify function logs (Netlify dashboard → Functions)
- Verify `userId: currentUser` is being sent with each entry

## 🎉 Done!

Your app is now live with MongoDB backing it. Users can access from any device, and all data syncs in real-time.

## 📚 Next Steps

- Add authentication (login system)
- Add data validation on backend
- Set up automated backups in MongoDB Atlas
- Create admin dashboard for analytics
