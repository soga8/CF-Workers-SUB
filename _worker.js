let mytoken = 'auto'; // token configuration
let BotToken = ''; // Telegram Bot Token
let ChatID = ''; // Telegram Chat ID
let TG = 0; // Telegram notification switch
let FileName = 'CF-Workers-SUB';
let SUBUpdateTime = 6; // subscription update interval in hours

// Nodes and subscription links
let MainData = `
vless://b7a392e2-4ef0-4496-90bc-1c37bb234904@[2606:4700:4700::1111]:443?encryption=none&security=tls&sni=edgetunnel-2z2.pages.dev&fp=random&type=ws&host=edgetunnel-2z2.pages.dev&path=%2F%3Fed%3D2048#Example_IPv6_Node
https://sub.xf.free.hr/auto
https://hy2sub.pages.dev
`

let urls = []; // additional subscription links
let subconverter = "apiurl.v1.mk"; // subscription converter API
let subconfig = "https://raw.githubusercontent.com/cmliu/ACL4SSR/main/Clash/config/ACL4SSR_Online_MultiCountry.ini"; // subscription config file

export default {
    async fetch(request, env) {
        const userAgentHeader = request.headers.get('User-Agent');
        const userAgent = userAgentHeader ? userAgentHeader.toLowerCase() : "null";
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        mytoken = env.TOKEN || mytoken;
        BotToken = env.TGTOKEN || BotToken;
        ChatID = env.TGID || ChatID;
        TG = env.TG || TG;
        subconverter = env.SUBAPI || subconverter;
        subconfig = env.SUBCONFIG || subconfig;
        FileName = env.SUBNAME || FileName;
        MainData = env.LINK || MainData;
        if (env.LINKSUB) urls = await ADD(env.LINKSUB);

        let links = await ADD(MainData + '\n' + urls.join('\n'));
        let link = "";
        let linksub = "";

        for (let x of links) {
            if (x.toLowerCase().startsWith('http')) {
                linksub += x + '\n';
            } else {
                link += x + '\n';
            }
        }
        MainData = link;
        urls = await ADD(linksub);
        let sublinks = request.url;

        let warp = env.WARP;
        if (warp && warp != "") sublinks += '|' + (await ADD(warp)).join('|');

        if (!(token == mytoken || url.pathname == ("/" + mytoken) || url.pathname.includes("/" + mytoken + "?"))) {
            if (TG == 1 && url.pathname !== "/" && url.pathname !== "/favicon.ico") await sendMessage("#异常访问", request.headers.get('CF-Connecting-IP'), `UA: ${userAgent}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
            return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
            <title>Welcome to nginx!</title>
            <style>
                body {
                    width: 35em;
                    margin: 0 auto;
                    font-family: Tahoma, Verdana, Arial, sans-serif;
                }
            </style>
            </head>
            <body>
            <h1>Welcome to nginx!</h1>
            <p>If you see this page, the nginx web server is successfully installed and
            working. Further configuration is required.</p>
            <p>For online documentation and support please refer to
            <a href="http://nginx.org/">nginx.org</a>.<br/>
            Commercial support is available at
            <a href="http://nginx.com/">nginx.com</a>.</p>
            <p><em>Thank you for using nginx.</em></p>
            </body>
            </html>
            `, {
                headers: {
                    'Content-Type': 'text/html; charset=UTF-8',
                },
            });
        } else if (TG == 1 || !userAgent.includes('subconverter') || !userAgent.includes('null')) {
            await sendMessage("#获取订阅", request.headers.get('CF-Connecting-IP'), `UA: ${userAgentHeader}</tg-spoiler>\n域名: ${url.hostname}\n<tg-spoiler>入口: ${url.pathname + url.search}</tg-spoiler>`);
        }

        let req_data = MainData;
        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 1618);

        try {
            const responses = await Promise.allSettled(urls.map(url =>
                fetch(url, {
                    method: 'get',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;',
                        'User-Agent': `v2rayn/6.42 cmliu/CF-Workers-SUB ${userAgentHeader}`
                    },
                    signal: controller.signal
                }).then(response => {
                    if (response.ok) {
                        return response.text().then(content => {
                            if (content.includes('dns') && content.includes('proxies') && content.includes('proxy-groups') && content.includes('rules')) {
                                sublinks += "|" + url;
                            } else if (content.includes('dns') && content.includes('outbounds') && content.includes('inbounds')) {
                                sublinks += "|" + url;
                            } else {
                                return content;
                            }
                        });
                    } else {
                        return "";
                    }
                })
            ));
            for (const response of responses) {
                if (response.status === 'fulfilled') {
                    const content = await response.value;
                    req_data += base64Decode(content) + '\n';
                }
            }
        } catch (error) {
        } finally {
            clearTimeout(timeout);
        }

        const utf8Encoder = new TextEncoder();
        const encodedData = utf8Encoder.encode(req_data);
        const text = String.fromCharCode.apply(null, encodedData);

        const uniqueLines = new Set(text.split('\n'));
        const result = [...uniqueLines].join('\n');

        const base64Data = btoa(result);

        let target = "v2ray";
        if (userAgent.includes('clash') && !userAgent.includes('nekobox')) {
            target = "clash";
        } else if (userAgent.includes('sing-box') || userAgent.includes('singbox')) {
            target = "singbox";
        } else {
            return new Response(base64Data, {
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                    "Profile-Update-Interval": `${SUBUpdateTime}`,
                }
            });
        }

        const subconverterUrl = `https://${subconverter}/sub?target=${target}&url=${encodeURIComponent(sublinks)}&insert=false&config=${encodeURIComponent(subconfig)}&emoji=true&list=false&tfo=false&scv=true&fdn=false&sort=false&new_name=true`;

        try {
            const subconverterResponse = await fetch(subconverterUrl);
            if (!subconverterResponse.ok) {
                throw new Error(`Error fetching subconverterUrl: ${subconverterResponse.status} ${subconverterResponse.statusText}`);
            }
            const subconverterContent = await subconverterResponse.text();
            return new Response(subconverterContent, {
                headers: {
                    "Content-Disposition": `attachment; filename*=utf-8''${encodeURIComponent(FileName)}; filename=${FileName}`,
                    "content-type": "text/plain; charset=utf-8",
                    "Profile-Update-Interval": `${SUBUpdateTime}`,
                }
            });
        } catch (error) {
            return new Response(`Error: ${error.message}`, {
                status: 500,
                headers: { 'content-type': 'text/plain; charset=utf-8' },
            });
        }
    }
};

async function sendMessage(type, ip, add_data = "") {
    if (BotToken !== '' && ChatID !== '') {
        let msg = "";
        const response = await fetch(`http://ip-api.com/json/${ip}?lang=zh-CN`);
        if (response.status == 200) {
            const ipInfo = await response.json();
            msg = `${type}\nIP: ${ip}\n国家: ${ipInfo.country}\n<tg-spoiler>城市: ${ipInfo.city}\n组织: ${ipInfo.org}\nASN: ${ipInfo.as}\n${add_data}`;
        } else {
            msg = `${type}\nIP: ${ip}\n<tg-spoiler>${add_data}`;
        }
        let url = "https://api.telegram.org/bot" + BotToken + "/sendMessage?chat_id=" + ChatID + "&parse_mode=HTML&text=" + encodeURIComponent(msg);
        return fetch(url, {
            method: 'get',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;',
                'Accept-Encoding': 'gzip, deflate, br',
                'User-Agent': 'Mozilla/5.0 Chrome/90.0.4430.72'
            }
        });
    }
}

function base64Decode(str) {
    const bytes = new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
}

async function ADD(envadd) {
    var addtext = envadd.replace(/[ "'|\r\n]+/g, ',').replace(/,+/g, ',');
    if (addtext.charAt(0) == ',') addtext = addtext.slice(1);
    if (addtext.charAt(addtext.length - 1) == ',') addtext = addtext.slice(0, addtext.length - 1);
    const add = addtext.split(',');
    return add;
}
