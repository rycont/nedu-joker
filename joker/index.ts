import cookieStore from 'tough-cookie-file-store'
import { CookieJar } from 'tough-cookie'
import nodeFetch, { RequestInit } from 'node-fetch'
import fetcher, { TFetch } from 'fetch-cookie'
import { load } from 'cheerio'
import FormData from 'form-data'

export class Benedu {
    fetch: TFetch
    constructor({
        jarPath = './jar.json',
        jar
    }: {
        jarPath?: string,
        jar?: CookieJar
    } = {}) {
        this.fetch = fetcher(nodeFetch, jar || new CookieJar(new cookieStore(jarPath)))
    }
    async getPage({
        uri,
        option = {}
    }: {
        uri: string,
        option?: RequestInit & {
            rawText?: boolean
        }
    }) {
        const plainText = (await (await this.fetch(uri, option)).text())
        return option.rawText ? plainText : load(plainText)
    }
    async getHeader({
        uri,
        option
    }: {
        uri: string,
        option: RequestInit
    }) {
        return (await this.fetch(uri, option)).headers
    }

    async login({
        email,
        password
    }: {
        email: string,
        password: string
    }) {
        var formdata = new FormData();
        formdata.append("inputEmail", email);
        formdata.append("inputPassword", password);
        (() => {
            formdata.append("__EVENTTARGET", "ctl00$uclogin$lnkLogin");
            formdata.append("__EVENTARGUMENT", "");
            formdata.append("File_Picture", "");
            formdata.append("optUsrGb", "2");
            formdata.append("__VIEWSTATEGENERATOR", "90059987");
            formdata.append("__VIEWSTATE", "/wEPDwUJMzI3MzEzMjQ0ZGTe0mPrXI26I71t2Tc08sZ49Yb6bc8zo+xWRkmEo338sg==");
        })()

        var requestOptions = {
            method: 'POST',
            body: formdata,
            redirect: 'follow',
            rawText: true
        };

        await this.getPage({
            uri: "https://www.benedu.co.kr/Index.aspx",
            option: requestOptions as any
        })
        const loggedInIndex = await this.getPage({
            uri: "https://www.benedu.co.kr/Views/01_Students/00StdHome.aspx",
            option: { rawText: true }
        }) as string
        return loggedInIndex.includes('학습하기')
    }
}