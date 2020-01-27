import CookieStore from 'tough-cookie-file-store';
import { CookieJar } from 'tough-cookie';
import nodeFetch, { RequestInit, Headers, Response } from 'node-fetch';
import fetcher, { TFetch } from 'fetch-cookie';
// import { load } from 'cheerio'
import FormData from 'form-data';
import { createWriteStream, WriteStream } from 'promise-fs';
import { JSDOM } from 'jsdom';


type THomework =
  {
    index: number;
    subject: string;
    teacher: string;
    title: string;
    questionQuantity: number;
    completed: boolean;
    solvedQuantity: number;
    rightQuantity: number;
    registratedAt: Date;
    solvedAt: Date;
    solvingTime: number;
    startAt: Date;
    endAt: Date;
    examId: number;
  }

type TWord = {
  eng: string;
  kor: string;
}

export default class Benedu {
  fetch: TFetch

  loggerStream: WriteStream

  constructor({
    jarPath = './jar.json',
    jar,
  }: {
    jarPath?: string;
    jar?: CookieJar;
  } = {}) {
    this.fetch = fetcher(nodeFetch, jar || new CookieJar(new CookieStore(jarPath)));
    this.loggerStream = createWriteStream('./logfile', { flags: 'a' });
    this.log(`==========${Date()}==========`);
  }

  log = (data: string): boolean => this.loggerStream.write(`${data}\n`)

  async getPage({
    uri,
    option = {},
  }: {
    uri: string;
    option?: RequestInit & {
      rawText?: boolean;
    };
  }): Promise<string | DocumentFragment> {
    const plainText = (await (await this.fetch(uri, option)).text());
    if (option.rawText) return plainText;
    return JSDOM.fragment(plainText);
  }

  async getHeader({
    uri,
    option,
  }: {
    uri: string;
    option: RequestInit;
  }): Promise<Headers> {
    return (await this.fetch(uri, option)).headers;
  }

  async login({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<boolean> {
    const formdata = new FormData();
    formdata.append('inputEmail', email);
    formdata.append('inputPassword', password);
    ((): void => {
      formdata.append('__EVENTTARGET', 'ctl00$uclogin$lnkLogin');
      formdata.append('__EVENTARGUMENT', '');
      formdata.append('File_Picture', '');
      formdata.append('optUsrGb', '2');
      formdata.append('__VIEWSTATEGENERATOR', '90059987');
      formdata.append('__VIEWSTATE', '/wEPDwUJMzI3MzEzMjQ0ZGTe0mPrXI26I71t2Tc08sZ49Yb6bc8zo+xWRkmEo338sg==');
    })();

    const requestOptions = {
      method: 'POST',
      body: formdata,
      rawText: true,
    };

    await this.getPage({
      uri: 'https://www.benedu.co.kr/Index.aspx',
      option: requestOptions,
    });
    const loggedInIndex = await this.getPage({
      uri: 'https://www.benedu.co.kr/Views/01_Students/00StdHome.aspx',
      option: { rawText: true },
    }) as string;
    return loggedInIndex.includes('학습하기');
  }

  async getHomeworks(): Promise<THomework[]> {
    const formdata = new FormData();
    formdata.append('ctl00$smBenedu', 'ctl00$smBenedu|ctl00$body$lnkSearch');
    formdata.append('__EVENTTARGET', 'ctl00$body$lnkSearch');
    formdata.append('__ASYNCPOST', 'true');


    const homeworksPlainText = ((await this.getPage({
      uri: 'https://www.benedu.co.kr/Views/01_Students/03StdStudy04Homework.aspx',
      option: {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 Edg/79.0.309.71',
        },
        body: formdata,
        rawText: true,
      },
    })) as string).split('|updatePanel|body_udpUnitTestList|')[0].split('|updatePanel|body_udpTestList|')[1];
    const dom = JSDOM.fragment(homeworksPlainText);
    const homeworks = [...Array.from(dom.querySelectorAll('table tbody tr'))].map((tr) => {
      const [, index, subject, teacher, title,
        questionQuantity, completed, solvedQuantity,
        rightQuantity, registratedAt, solvedAt,
        solvingTime, startAt, endAt] = Array.from(tr.children).map((td) => td.innerHTML);
      const homework: THomework = {
        index: Number(index),
        subject,
        teacher,
        title,
        questionQuantity: Number(questionQuantity),
        completed: completed === '응시완료',
        solvedQuantity: Number(solvedQuantity),
        rightQuantity: Number(rightQuantity),
        registratedAt: new Date(registratedAt),
        solvedAt: new Date(solvedAt),
        solvingTime: Number(solvingTime.slice(0, -1)),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        examId: Number(tr.children[0].innerHTML.match(/Check_Exam\(&quot;(.*?)&quot;, this\)/)[1]),
      };
      return homework;
    });
    return homeworks;
  }

  async getProblems({
    examId,
    page,
  }: {
    examId: number;
    page: number;
  }): Promise<string[]> {
    const problemsDom = await this.getPage({
      uri: `https://www.benedu.co.kr/Views/01_Students/03StdStudy30TakeExam.aspx?ibt_id=${examId}&ibq_id=${page}&ibt_type=02&view_type=01`,
    }) as DocumentFragment;
    return Array.from(problemsDom.querySelectorAll('#examViewType1 tbody td')).map((td) => td.innerHTML);
  }

  async getDailyWords(date: Date): Promise<TWord[]> {
    const formdata = new FormData();
    formdata.append('ctl00$smBenedu', 'ctl00$body$UpdatePanel1|ctl00$body$lnkTodayWord');
    formdata.append('__EVENTTARGET', 'ctl00$body$lnkTodayWord');
    formdata.append('__ASYNCPOST', 'true');
    formdata.append('__EVENTARGUMENT', `${date.toISOString().split('T')[0]}＃1`);
    const dailyWordsPlainText = (await this.getPage({
      uri: 'https://www.benedu.co.kr/Views/01_Students/00StdHome.aspx',
      option: {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36 Edg/79.0.309.71',
        },
        body: formdata,
        rawText: true,
      },
    }) as string).split('|updatePanel|body_udpUnitTestList|')[0].split('updatePanel|body_udpSubmit|')[1];
    const dom = JSDOM.fragment(dailyWordsPlainText);
    this.log(dailyWordsPlainText);
    return Array.from(dom.querySelectorAll('.panel-heading div')).map((el: HTMLDivElement): TWord => {
      const [eng, , kor] = Array.from(el.querySelectorAll('span')).map((e) => e.innerHTML);
      return { eng, kor };
    });
  }
}
