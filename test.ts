import Benedu from './joker';

const me = new Benedu();
(async (): Promise<void> => {
  console.log(await me.getDailyWords(new Date('2020-01-11')));
})();
