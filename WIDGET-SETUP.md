# Neue World Chat Widget — Webflow Setup

## How to add the chat widget to Webflow

1. Open your Webflow project
2. Go to **Site Settings > Custom Code > Footer Code**
3. Paste the snippet below
4. Save and publish

```html
<script>
(function() {
  var CHAT_URL = 'https://neue-chat-fdg9a.ondigitalocean.app';

  var btn = document.createElement('div');
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.15)';
  document.body.appendChild(btn);

  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;bottom:96px;right:24px;width:400px;height:600px;z-index:9999;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);display:none';
  wrap.innerHTML = '<iframe src="' + CHAT_URL + '" style="width:100%;height:100%;border:none"></iframe>';
  document.body.appendChild(wrap);

  btn.onclick = function() {
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>
```

## What it does

- Adds a floating chat bubble (bottom-right corner)
- Clicking the bubble opens/closes the chat window
- The chat loads from our hosted app inside an iframe

## Notes

- No Webflow plan upgrade needed — custom code works on any paid site plan
- The widget appears on every page. To limit it to specific pages, paste the snippet in **Page Settings > Custom Code > Before `</body>` tag** on just those pages instead
- To change the bubble position or size, edit the `style.cssText` values in the snippet
