import { Actor, ProxyConfigurationOptions, launchPuppeteer, pushData } from 'apify';
import fs from 'fs';
import { GPTS } from './types';

interface Input {
    maxItems: number;
    gptsUrls: string[];
    proxyConfiguration: ProxyConfigurationOptions;
}

await Actor.init();

const input = await Actor.getInput<Input>() ?? {} as Input;
const { maxItems, gptsUrls, proxyConfiguration: proxyConfigurationOptions } = input;

const urls: string[] = gptsUrls ?? [];

const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfigurationOptions);

const browser = await launchPuppeteer({ proxyConfiguration });

for (const url of urls.slice(0, maxItems || urls.length)) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const data = await page.evaluate(() => {
        const logo = (document.querySelector('.logo-container .logo img') as HTMLImageElement)?.src;
        const title = (document.querySelector('.title') as HTMLElement)?.innerText;
        const author = (document.querySelector('.type-author-time .author span') as HTMLElement)?.innerText;
        const description = Array.from(document.querySelectorAll('.bx--snippet--multi pre code')).map(el => (el as HTMLElement).innerText).join('\n');
        const conversationStarters = Array.from(document.querySelectorAll('.bx--snippet--wraptext pre code')).map(el => (el as HTMLElement).innerText).join('\n');
        const views = (document.querySelector('.stats-icons .icon-wrapper[title^="Views:"] span:last-child') as HTMLElement)?.innerText;
        const usages = (document.querySelector('.stats-icons .icon-wrapper[title^="Usages:"] span:last-child') as HTMLElement)?.innerText;
        const votes = (document.querySelector('.stats-icons .icon-wrapper[title^="Votes:"] span:last-child') as HTMLElement)?.innerText;
        const tryButtonUrl = (document.querySelector('.chatgpt-try-button a') as HTMLAnchorElement)?.href;

        return {
            logo,
            title,
            author,
            description,
            conversationStarters,
            views,
            usages,
            votes,
            tryButtonUrl,
            url
        };
    });

    await pushData(data);
    await page.close();
}

await browser.close();
await Actor.exit();
