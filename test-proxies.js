const url = "https://www.gutenberg.org/ebooks/2680.txt.utf-8";
const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

async function test() {
    for (const p of proxies) {
        console.log("Testing:", p);
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(p, { signal: controller.signal });
            clearTimeout(timer);
            console.log("Status:", res.status);
            if (res.ok) {
                const text = await res.text();
                console.log("Text length:", text.length);
                if (text.length > 500) {
                    console.log("SUCCESS!");
                    return;
                }
            }
        } catch (e) {
            console.error("Failed:", e.message);
        }
    }
}
test();
