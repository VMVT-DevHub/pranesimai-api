'use strict';

import moleculer from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Survey, SurveyAuthType } from './surveys.service';
import { Page } from './pages.service';
import { AuthRelation, Question, QuestionType } from './questions.service';
import { QuestionOption } from './questionOptions.service';

type SurveyTemplate = {
  title: Survey['title'];
  description?: Survey['description'];
  icon: Survey['icon'];
  authType: SurveyAuthType;
  pages: Array<{
    title: Page['title'];
    description?: Page['description'];
    questions?: Array<{
      id: string; // excel id
      nextQuestion?: string; // excel id
      type: Question['type'];
      title: Question['title'];
      hint?: Question['hint'];
      description?: Question['description'];
      required: Question['required'];
      riskEvaluation: Question['riskEvaluation'];
      authRelation?: Question['authRelation'];
      condition?: {
        question: string; // excel id
        value?: Question['condition']['value']; // if not present, will be detected automatically
      };
      options?: Array<{
        nextQuestion?: string; // excel id
        title: QuestionOption['title'];
      }>;
    }>;
  }>;
};

type SurveyTemplatePage = SurveyTemplate['pages'][0];
type SurveyTemplateQuestion = SurveyTemplatePage['questions'][0];
type QuestionExtends = Partial<SurveyTemplateQuestion>;

const q = (
  type: QuestionType,
  id: number | string,
  nextQuestion: number | string,
  title: Question['title'],
  fields: Partial<SurveyTemplateQuestion> = {},
): SurveyTemplateQuestion => ({
  id: `${id}`,
  nextQuestion: nextQuestion && `${nextQuestion}`,
  type,
  title,
  required: true,
  riskEvaluation: true,
  ...fields,
});

type TypeFactory = (
  id: number | string,
  nextQuestion: number | string,
  title: Question['title'],
  fields?: Partial<SurveyTemplateQuestion>,
) => SurveyTemplateQuestion;

q.input = q.bind(null, QuestionType.INPUT) as TypeFactory;
q.date = q.bind(null, QuestionType.DATE) as TypeFactory;
q.datetime = q.bind(null, QuestionType.DATETIME) as TypeFactory;
q.select = q.bind(null, QuestionType.SELECT) as TypeFactory;
q.multiselect = q.bind(null, QuestionType.MULTISELECT) as TypeFactory;
q.radio = q.bind(null, QuestionType.RADIO) as TypeFactory;
q.location = q.bind(null, QuestionType.LOCATION) as TypeFactory;
q.text = q.bind(null, QuestionType.TEXT) as TypeFactory;
q.checkbox = q.bind(null, QuestionType.CHECKBOX) as TypeFactory;
q.files = q.bind(null, QuestionType.FILES) as TypeFactory;

// condition
const c = (id: number | string) => ({
  question: `${id}`,
});

// options
const o = (options: string[]) =>
  options.map((title) => ({
    title,
  }));

// options with incremental nextQuestion
const oi = (startId: number, options: string[]) =>
  options.map((title) => ({
    title,
    nextQuestion: `${startId++}`,
  }));

// single option helper
const os = (title: string, nextQuestion?: number | string) => ({
  title,
  nextQuestion: nextQuestion && `${nextQuestion}`,
});

const pages = {
  kontaktiniai: (
    id: number,
    q1: QuestionExtends = {},
    additionalQuestinos: SurveyTemplateQuestion[] = [],
  ) => ({
    title: 'Kontaktiniai duomenys',
    description: 'Patikslinkite savo kontaktinius duomenis',
    questions: [
      q.input(id, id + 1, 'El. pašto adresas', {
        riskEvaluation: false,
        authRelation: AuthRelation.EMAIL,
        ...q1,
      }),
      ...additionalQuestinos,
    ],
  }),

  tema: () => ({
    title: 'Pranešimo tema',
    description: 'Pasirinkite, dėl ko teikiate pranešimą',
  }),

  detales: () => ({
    title: 'Pranešimo detalės',
    description: 'Pateikite išsamią informaciją',
  }),

  papildoma: () => ({
    title: 'Papildoma informacija',
  }),

  informacija: (
    id: number,
    q1: QuestionExtends = {},
    q2: QuestionExtends = {},
    q3: QuestionExtends = {},
  ) => ({
    title: 'Veiklos informacija',
    description: 'Pateikite papildomą informaciją',
    questions: [
      q.location(id, id + 1, 'Nurodykite veiklos vietos adresą', {
        riskEvaluation: false,
        ...q1,
      }),
      q.input(id + 1, id + 2, 'Nurodykite veiklos pavadinimą', {
        riskEvaluation: false,
        ...q2,
      }),
      q.text(id + 2, id + 3, 'Nurodykite veiklą vykdančius fizinius ar juridinius asmenis', {
        riskEvaluation: false,
        ...q3,
      }),
    ],
  }),

  aplinkybes: (
    id: number,
    q1: QuestionExtends = {},
    additionalQuestinos: SurveyTemplateQuestion[] = [],
  ) => ({
    title: 'Įvykio aplinkybės',
    questions: [
      q.text(
        id,
        id + 1,
        'Pateikite visus jums žinomus faktus ir aplinkybes susijusius su pranešamu įvykiu',
        {
          required: false,
          riskEvaluation: false,
          ...q1,
        },
      ),
      ...additionalQuestinos,
    ],
  }),

  vaizdine: (id: number, q1: QuestionExtends = {}, q2: QuestionExtends = {}) => ({
    title: 'Vaizdinė medžiaga ir kiti dokumentai',
    description:
      'Pridėkite vaizdinę medžiagą (nuotraukas, video) arba kitus dokumentus įrodančius pateikiamus',
    questions: [
      q.radio(id, undefined, 'Ar galite pateikti įrodymų apie pranešamus pažeidimus?', {
        options: [os('Taip', id + 1), os('Ne', id + 2)],
        ...q1,
      }),
      q.files(id + 1, id + 2, 'Pridėkite vaizdinę ar kitą medžiagą', {
        riskEvaluation: false,
        condition: c(id),
        ...q2,
      }),
    ],
  }),

  teises: (id: number, q1: QuestionExtends = {}, q2: QuestionExtends = {}) => ({
    title: 'Jūsų teisės, pareigos ir atsakomybės',
    description: 'Sutikimas',
    questions: [
      q.checkbox(id, id + 1, 'Patvirtinu kad susipažinau su pranešimų pateikimo VMVT tvarka', q1),
      q.checkbox(
        id + 1,
        undefined,
        'Patvirtinu, kad esu susipažinęs su teisinėmis pasekmėmis už melagingos informacijos teikimą, o mano teikiama informacija yra teisinga.',
        q2,
      ),
    ],
  }),
};

const SURVEYS_SEED: SurveyTemplate[] = [
  // SURVEY 1
  {
    title: 'Maisto srities pranešimų anketa',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.0167 29.4973L24.0442 22.2748C28.2967 19.9123 34.8217 26.2798 32.3917 30.6223L25.1467 43.6948C20.4667 52.1098 2.44418 34.2673 11.0167 29.4973Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M24.292 21.375L22.042 16.2225C21.367 14.58 20.467 13.5 18.667 13.5H10.792C6.94449 13.5 5.16699 14.625 5.16699 19.125C5.35564 23.161 6.94719 27.0046 9.66699 29.9925" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.667 13.5C18.667 10.0125 19.207 4.5 14.167 4.5C9.66699 4.5 8.54199 9.3825 8.54199 13.5" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33.2923 30.375L38.4448 32.625C40.0873 33.3 41.1673 34.2 41.1673 36V43.875C41.1673 47.7225 40.0423 49.5 35.5423 49.5C31.5063 49.3113 27.6627 47.7198 24.6748 45" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.167 36.0002C44.6545 36.0002 50.167 35.4602 50.167 40.5002C50.167 45.0002 45.2845 46.1252 41.167 46.1252" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    description:
      'Pranešimai apie neatitikimus maisto produktų kokybei, saugai, įskaitant maisto produktų, jų tiekėjų ar viešojo maitinimo įstaigų veiklą. Taip pat pranešimai apie nelegalią veiklą, susijusią su maisto produktų gamyba, platinimu ar pardavimu.',
    authType: SurveyAuthType.OPTIONAL,
    pages: [
      // =======================================
      pages.kontaktiniai(3),

      // =======================================
      {
        ...pages.tema(),
        questions: [
          q.select(4, undefined, 'Pasirinkite dėl ko pranešate', {
            riskEvaluation: false,
            options: oi(5, [
              'Dėl įsigytų maisto produktų ar su maistu besiliečiančių medžiagų',
              'Dėl pastebėtų prekybos vietoje maisto produktų ar su maistu besiliečiančių medžiagų',
              'Dėl įsigytų patiekalų',
              'Dėl suteiktų viešojo maitinimo paslaugų',
              'Dėl vykdomos maisto tvarkymo veiklos pažeidimų',
            ]),
          }),
        ],
      },

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date(5, 10, 'Nurodykite produktų įsigijimo datą'),
          q.date(6, 10, 'Nurodykite produktų pastebėjimo prekybos vietoje datą'),
          q.date(7, 11, 'Nurodykite patiekalų įsigijimo datą'),
          q.date(8, 11, 'Nurodykite paslaugų suteikimo datą'),
          q.date(9, 12, 'Nurodykite pranešamų pažeidimų pastebėjimo datą'),
          q.select(10, 13, 'Pasirinkite produkto tipą', {
            options: o([
              'Greitai gendantys produktai',
              'Negreitai gendantys produktai',
              'Su maistu besiliečiančios medžiagos',
              'Maisto papildai',
              'Specialios paskirties maisto produktai',
            ]),
          }),
          q.select(11, 14, 'Pasirinkite viešojo maitinimo veiklos tipą', {
            riskEvaluation: false,
            options: o([
              'Gėrimų pardavimo vartoti vietose (barų) veikla',
              'Kavinių, užkandinių, restoranų veikla',
              'Maisto pristatymo į namus veikla',
              'Maitinimo paslaugų tiekimo veikla (renginiams, kaimo turizmo sodybos ir kt.)',
              'Ikimokyklinio, mokyklinio ugdymo įstaigų maitinimo veikla',
              'Socialinės globos ir rūpybos įstaigų maitinimo veikla',
              'Sveikatos priežiūros įstaigų maitinimo veikla',
              'Vaikų stovyklų maitinimo veikla',
              'Kita viešojo maitinimo veikla',
            ]),
          }),
          q.select(12, 15, 'Pasirinkite veiklos tipą', {
            riskEvaluation: false,
            options: o([
              'Kavinių, užkandinių, restoranų veikla',
              'Maisto produktų prekybos veikla',
              'Internetinės maisto produktų prekybos veikla',
              'Maisto produktų gamybos veikla',
              'Maisto gamybos namų ūkio virtuvėse veikla',
              'Ikimokyklinio, mokyklinio ugdymo įstaigų maitinimo veikla',
              'Gėrimų pardavimo vartoti vietose (barų) veikla',
              'Maitinimo paslaugų tiekimo veikla (renginiams, kaimo turizmo sodybos ir kt.)',
              'Socialinės globos ir rūpybos įstaigų maitinimo veikla',
              'Vaikų stovyklų maitinimo veikla',
              'Maisto pristatymo į namus veikla',
              'Sveikatos priežiūros įstaigų maitinimo veikla',
              'Laisvės atėmimo vietų maitinimo veikla',
              'Kepyklų veikla',
              'Maisto produktų fasavimo, pakavimo veikla',
              'Maisto produktų sandėliavimo veikla',
              'Gyvūninio maisto tvarkymo veikla',
              'Alkoholinių gėrimų gamybos veikla',
              'Daržovių, vaisių, uogų kitų maistui vartojamų augalų auginimo veikla',
              'Maisto papildų gamybos veikla',
              'Maisto produktų prekybos iš automatų veikla',
              'Žaliavinio pieno supirkimo punkto, surinkimo centro veikla',
              'Kita veikla',
            ]),
          }),
          q.multiselect(13, 16, 'Pasirinkite apie kokius produkto pažeidimus pranešate', {
            options: o([
              'Kokybės pažeidimai',
              'Tinkamumo vartoti terminų pažeidimai',
              'Ženklinimo pažeidimai',
              'Produktas užterštas cheminiais, fiziniais, mikrobiniais ar kitokiais teršalais',
              'Maisto papildų notifikavimo pažeidimai',
              'Alergenų informacijos pateikimo pažeidimai',
              'Kainų, kiekių, tūrio, svorio neatitikimai',
              'Produktų klastotė',
              'Reklamos pažeidimai',
              'Kiti pažeidimai',
            ]),
          }),
          q.multiselect(14, 20, 'Pasirinkite apie kokius pažeidimus pranešate', {
            options: o([
              'Kokybės pažeidimai',
              'Pateiktas sugedęs, netinkamos išvaizdos, skonio, kvapo patiekalas',
              'Patiekalai patiekiami netinkamos temperatūros',
              'Patiekalas netinkamai termiškai apdorotas (neiškepęs, perkepęs, sudegintas)',
              'Produktas užterštas cheminiais, fiziniais, mikrobiniais ar kitokiais teršalais',
              'Neleistinos sudedamosios dalys',
              'Alergenų informacijos pateikimo pažeidimai',
              'Netinkamos produktų, patiekalų laikymo sąlygos',
              'Kainų, kiekių, tūrio, svorio neatitikimai',
              'Nesilaikoma sudaryto meniu',
              'Sudarytas meniu neatitinka reikalavimų',
              'Kiti pažeidima',
            ]),
          }),
          q.multiselect(15, 21, 'Pasirinkite apie kokius veklos pažeidimus pranešate', {
            options: o([
              'Vykdoma veikla be leidimų/registracijos',
              'Netinkamos produktų, patiekalų laikymo sąlygos',
              'Patalpos nehigieniškos, neatitinka nustatytų reikalavimų',
              'Veikla vykdoma neįsidiegus savikontrolės sistemos',
              'Neužtikrinami biologinės saugos reikalavimai',
              'Netinkamai tvarkomos atliekos',
              'Netinkamai pildomi veiklos dokumentai',
              'Nepateikiama privalomoji informacija apie vykdomą veiklą',
              'Darbuotojų higienos įgūdžių pažeidimai',
              'Ženklinimo pažeidimai',
              'Tinkamumo vartoti terminų pažeidimai',
              'Neleistinos sudedamosios dalys',
              'Produktų klastotės',
              'Maisto papildų notifikavimo pažeidimai',
              'Prekiaujama neleistinais produktais',
              'Reklamos pažeidimai',
              'Kainų, kiekių, tūrio, svorio neatitikimai',
              'Kiti pažeidima',
            ]),
          }),
          q.input(16, 17, 'Nurodykite produkto pavadinimą', {
            riskEvaluation: false,
            hint: 'Nurodykite tikslų produkto pavadinimą (pvz. varškės sūrelis "XXXX")',
          }),
          q.radio(17, undefined, 'Ar galite nurodyti gamintoją?', {
            riskEvaluation: false,
            options: [os('Taip', '17.1'), os('Ne', 18)],
          }),
          q.input('17.1', 18, 'Produkto gamintojas', {
            riskEvaluation: false,
            condition: c(17),
          }),
          q.radio(18, undefined, 'Ar galite nurodyti importuotoją?', {
            riskEvaluation: false,
            options: [os('Taip', '18.1'), os('Ne', 19)],
          }),
          q.input('18.1', 19, 'Produkto importuotojas', {
            condition: c(18),
          }),
          q.date(19, 21, 'Nurodykite produktų tinkamumo vartoti terminą', {
            riskEvaluation: false,
          }),
          q.input(20, 21, 'Nurodykite patiekalo pavadinimą', {
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      pages.informacija(21),

      // =======================================
      pages.aplinkybes(24),

      // =======================================
      pages.vaizdine(25),

      // =======================================
      pages.teises(27),
    ],
  },

  // SURVEY 2
  {
    title: 'Pašarų ar veterinarijos vaistų pranešimas',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M23.6253 46.1248L46.1253 23.6248C47.1766 22.5944 48.0133 21.3659 48.5869 20.0102C49.1605 18.6545 49.4597 17.1985 49.4672 15.7265C49.4746 14.2544 49.1901 12.7955 48.6302 11.4341C48.0703 10.0726 47.2461 8.83572 46.2052 7.79481C45.1643 6.75391 43.9274 5.92967 42.5659 5.36978C41.2045 4.80988 39.7456 4.52542 38.2736 4.53286C36.8015 4.54029 35.3455 4.83947 33.9898 5.41309C32.6341 5.98671 31.4056 6.8234 30.3753 7.87476L7.87525 30.3748C6.82389 31.4051 5.9872 32.6336 5.41358 33.9893C4.83996 35.345 4.54078 36.801 4.53335 38.2731C4.52591 39.7451 4.81037 41.204 5.37026 42.5655C5.93016 43.9269 6.75439 45.1638 7.7953 46.2047C8.83621 47.2456 10.0731 48.0699 11.4346 48.6298C12.796 49.1897 14.2549 49.4741 15.727 49.4667C17.199 49.4592 18.655 49.1601 20.0107 48.5864C21.3664 48.0128 22.5949 47.1761 23.6253 46.1248Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M19.125 19.125L34.875 34.875" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
    `,
    authType: SurveyAuthType.OPTIONAL,
    description:
      'Pranešimai apie pašarų ar veterinarinių vaistų, taip pat jų tiekėjų neatitikimus teisės aktams, kokybės ar saugos reikalavimams. pranešimai apie nelegalią šių produktų gamybą, tiekimą ar naudojimą.',
    pages: [
      // =======================================
      pages.kontaktiniai(3),

      // =======================================
      {
        ...pages.tema(),
        questions: [
          q.select(4, 5, 'Pasirinkite dėl ko pranešate', {
            riskEvaluation: false,
            options: [
              os('Dėl įsigytų pašarų', 5),
              os('Dėl pastebėtų prekybos vietoje pašarų', 5),
              os('Dėl įsigytų veterinarinių vaistų', 5),
              os('Dėl pastebėtų prekybos vietoje veterinarinių vaistų', 5),
              os('Dėl pašarų gamybos veiklos', '5.0'),
              os('Dėl pašarų prekybos veiklos', '5.0'),
              os('Dėl veterinarinių vaistų gamybos veiklos', '5.0'),
              os('Dėl veterinarinių vaistų prekybos veiklos', '5.0'),
            ],
          }),
        ],
      },

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.multiselect('5.0', 5, 'Nurodykite kokius veiklos pažeidimus pranešate', {
            riskEvaluation: false,
            options: o([
              'Vykdoma veikla be leidimų/registracijos',
              'Netinkamos produktų, patiekalų laikymo sąlygos',
              'Patalpos nehigieniškos, neatitinka nustatytų reikalavimų',
              'Veikla vykdoma neįsidiegus savikontrolės sistemos',
              'Neužtikrinami biologinės saugos reikalavimai',
              'Netinkamai tvarkomos atliekos',
              'Netinkamai pildomi veiklos dokumentai',
              'Nepateikiama privalomoji informacija apie vykdomą veiklą',
              'Darbuotojų higienos įgūdžių pažeidimai',
              'Ženklinimo pažeidimai',
              'Tinkamumo vartoti terminų pažeidimai',
              'Neleistinos sudedamosios dalys',
              'Produktų klastotės',
              'Veterinarinių vaistų notifikavimo pažeidimai',
              'Prekiaujama neleistinais produktais',
              'Reklamos pažeidimai',
              'Kainų, kiekių, tūrio, svorio neatitikimai',
              'Kiti pažeidimai',
            ]),
          }),
          q.date(5, 6, 'Nurodykite produktų įsigijimo datą'),
          q.date(6, 7, 'Nurodykite produktų pastebėjimo prekybos vietoje datą'),
          q.multiselect(7, 8, 'Pasirinkite apie kokius produkto pažeidimus pranešate', {
            options: o([
              'Kokybės pažeidimai',
              'Ženklinimo pažeidimai',
              'Tinkamumo vartoti terminų pažeidimai',
              'Produktų klastotės',
              'Neleistinos sudedamosios dalys',
              'Kainų, kiekių, tūrio, svorio neatitikimai',
              'Neregistruotas veterinarinis vaistas',
              'Alergenų informacijos pateikimo pažeidimai',
              'Prekiaujama neleistinais produktais',
              'Produktas užterštas cheminiais, fiziniais, mikrobiniais ar kitokiais teršalais',
              'Netinkamos veterinarinių vaistų/pašarų laikymo sąlygos',
              'Kiti pažeidimai',
            ]),
          }),
          q.input(8, 9, 'Nurodykite produkto pavadinimą', {
            riskEvaluation: false,
            hint: 'Nurodykite tikslų produkto pavadinimą (pvz. varškės sūrelis "XXXX")',
          }),
          q.radio(9, undefined, 'Ar galite nurodyti gamintoją?', {
            riskEvaluation: false,
            options: [os('Taip', '9.1'), os('Ne', 10)],
          }),
          q.input('9.1', 10, 'Produkto gamintojas', {
            riskEvaluation: false,
            condition: c(9),
          }),
          q.radio(10, undefined, 'Ar galite nurodyti importuotoją?', {
            riskEvaluation: false,
            options: [os('Taip', '10.1'), os('Ne', 11)],
          }),
          q.input('10.1', 11, 'Produkto importuotojas', {
            riskEvaluation: false,
            condition: c(10),
          }),
          q.date(11, '11.1', 'Nurodykite produktų tinkamumo vartoti terminą', {
            riskEvaluation: false,
          }),
          q.input('11.1', '11.2', 'Nurodykite veiklos vykdymo vietos adresą', {
            riskEvaluation: false,
          }),
          q.input('11.2', 12, 'Nurodykite veiklos vykdymo vietos pavadinimą', {
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      pages.informacija(12),

      // =======================================
      pages.aplinkybes(15),

      // =======================================
      pages.vaizdine(16),

      // =======================================
      pages.teises(18),
    ],
  },

  // SURVEY 3
  {
    title: 'Veterinarinės srities pranešimų',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M25.084 13.5C27.5693 13.5 29.584 11.4853 29.584 9C29.584 6.51472 27.5693 4.5 25.084 4.5C22.5987 4.5 20.584 6.51472 20.584 9C20.584 11.4853 22.5987 13.5 25.084 13.5Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M40.834 22.5C43.3193 22.5 45.334 20.4853 45.334 18C45.334 15.5147 43.3193 13.5 40.834 13.5C38.3487 13.5 36.334 15.5147 36.334 18C36.334 20.4853 38.3487 22.5 40.834 22.5Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M45.334 40.5C47.8193 40.5 49.834 38.4853 49.834 36C49.834 33.5147 47.8193 31.5 45.334 31.5C42.8487 31.5 40.834 33.5147 40.834 36C40.834 38.4853 42.8487 40.5 45.334 40.5Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M20.5839 22.5C22.0613 22.5 23.5242 22.791 24.8891 23.3564C26.254 23.9217 27.4942 24.7504 28.5389 25.795C29.5835 26.8397 30.4122 28.0799 30.9776 29.4448C31.5429 30.8097 31.8339 32.2726 31.8339 33.75V41.625C31.8333 43.507 31.1587 45.3266 29.9323 46.7542C28.7058 48.1818 27.0087 49.1229 25.1482 49.4071C23.2878 49.6914 21.3871 49.2999 19.7903 48.3036C18.1936 47.3074 17.0064 45.7723 16.4439 43.9763C15.4839 40.8788 13.4589 38.85 10.3689 37.89C8.57382 37.3278 7.03928 36.1415 6.04297 34.546C5.04666 32.9504 4.65439 31.0509 4.93715 29.1912C5.21992 27.3315 6.15903 25.6345 7.58455 24.4071C9.01007 23.1798 10.8278 22.5033 12.7089 22.5H20.5839Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    authType: SurveyAuthType.OPTIONAL,
    description:
      'Pranešimai apie gyvūnų gerovės pažeidimus, veterinarijos paslaugų teikėjų pažeidimus teisės aktų reikalavimams ar pranešimai apie nelegaliai vykdomą veterinarinę veiklą.',
    pages: [
      // =======================================
      pages.kontaktiniai(4),

      // =======================================
      {
        ...pages.tema(),
        questions: [
          q.select(5, undefined, 'Pasirinkite dėl ko pranešate', {
            riskEvaluation: false,
            options: [
              os('Dėl gyvūnų gerovės', '4.6'),
              os('Dėl gyvūnų augintinių veisimo veiklos', '4.10'),
              os('Dėl gyvūnų augintinių prekybos veiklos', '4.10'),
              os('Dėl ūkinių gyvūnų prekybos veiklos', '4.11'),
              os('Dėl gyvūnų transportavimo veiklos', '4.13'),
              os(
                'Dėl medžiojimo veiklos (veterinarinė priežiūra medžioklėje, pirminio apdorojimo aikštelės/patalpos, gyvūninių atliekų duobės)',
                '4.13',
              ),
              os('Dėl šalutinių gyvūninių produktų tvarkymo veiklos', '4.13'),
              os('Dėl Ūkininkavimo veiklos', '4.13'),
              os('Dėl veterinarinių paslaugų veiklos', '4.13'),
              os('Dėl kitos veterinarinės veiklos', '4.13'),
            ],
          }),
        ],
      },

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date('4.6', 6, 'Nurodykite pranešamo įvykio datą'),
          q.date('4.10', 10, 'Nurodykite pranešamo įvykio datą'),
          q.date('4.11', 11, 'Nurodykite pranešamo įvykio datą'),
          q.date('4.13', 13, 'Nurodykite pranešamo įvykio datą'),

          q.multiselect(6, undefined, 'Pasirinkite gyvūno tipą', {
            riskEvaluation: false,
            options: [
              os('Ūkiniai gyvūnai', 8),
              os('Gyvūnai augintiniai', 7),
              os('Laukiniai gyvūnai', 9),
            ],
          }),

          q.multiselect(7, undefined, 'Pasirinkite gyvūno augintinio rūšį', {
            riskEvaluation: false,
            options: [
              os('Šunys', 12),
              os('Katės', 12),
              os('Šeškai', 12),
              os('Graužikai', 12),
              os('Popliai', 12),
              os('Paukščiai', 12),
              os('Kita', '7.1'),
            ],
            condition: c(6),
          }),

          q.input('7.1', 12, 'Įveskite gyvūno augintinio rūšį', {
            riskEvaluation: false,
            condition: c(7),
          }),

          q.multiselect(8, undefined, 'Pasirinkite ūkinio gyvūno rūšį', {
            riskEvaluation: false,
            options: [
              os('Galvijai', 12),
              os('Arkliai', 12),
              os('Avys', 12),
              os('Ožkos', 12),
              os('Kiaulės', 12),
              os('Paukščiai', 12),
              os('Bitės', 12),
              os('Kita', '8.1'),
            ],
          }),

          q.input('8.1', 12, 'Įveskite ūkinio gyvūno rūšį', {
            riskEvaluation: false,
            condition: c(8),
          }),

          q.input(9, 12, 'Nurodykite laukinio gyvūno rūšį', {
            riskEvaluation: false,
          }),

          q.multiselect(10, undefined, 'Pasirinkite gyvūno augintinio rūšį', {
            riskEvaluation: false,
            options: [
              os('Šunys', 13),
              os('Katės', 13),
              os('Šeškai', 13),
              os('Graužikai', 13),
              os('Popliai', 13),
              os('Paukščiai', 13),
              os('Kita', '10.1'),
            ],
          }),

          q.input('10.1', 13, 'Įveskite gyvūno augintinio rūšį', {
            riskEvaluation: false,
            condition: c(10),
          }),

          q.multiselect(11, undefined, 'Pasirinkite ūkinio gyvūno rūšį', {
            riskEvaluation: false,
            options: [
              os('Galvijai', 13),
              os('Arkliai', 13),
              os('Avys', 13),
              os('Ožkos', 13),
              os('Kiaulės', 13),
              os('Paukščiai', 13),
              os('Bitės', 13),
              os('Kita', '11.1'),
            ],
          }),

          q.input('11.1', 13, 'Įveskite ūkinio gyvūno rūšį', {
            riskEvaluation: false,
            condition: c(11),
          }),

          q.multiselect(12, 14, 'Pasirinkite apie kokius gyvūnų gerovės  pažeidimus pranešate', {
            options: o([
              'Vakcinacijos pažeidimai',
              'Ženklinimo/registravimo pažeidimai',
              'Nėra užtikrinama gyvūnų gerovė, gyvūnais nepakankamai rūpinamasi, neužtikrinami jų fiziologiniai poreikiai, gyvūnai kitaip kankinami',
              'Laikymo sąlygų keliančių grėsmę gyvūnų sveikatai pažeidimai',
              'Nesuteikiama reikalinga veterinarinė pagalba',
              'Šėrimo/girdymo pažeidimai',
              'Kiti pažeidima',
            ]),
          }),

          q.multiselect(13, 16, 'Pasirinkite apie kokius veiklos pažeidimus pranešate', {
            options: o([
              'Ženklinimo/registravimo pažeidimai',
              'Vakcinacijos pažeidimai',
              'Nepateikiama privalomoji informacija apie vykdomą veiklą',
              'Vykdoma veikla be leidimų/registracijos',
              'Netinkamos sveikatos būklės gyvūnai',
              'Pardavinėjami per jauni gyvūnai',
              'Laikymo sąlygų keliančių grėsmę gyvūnų sveikatai pažeidimai',
              'Nėra užtikrinama gyvūnų gerovė, gyvūnais nepakankamai rūpinamasi, neužtikrinami jų fiziologiniai poreikiai, gyvūnai kitaip kankinami',
              'Nesuteikiama reikalinga veterinarinė pagalba',
              'Šėrimo/girdymo pažeidimai',
              'Netinkamai pildomi veiklos dokumentai',
              'Patalpos nehigieniškos, neatitinka nustatytų reikalavimų',
              'Veikla be galiojančių veterinarijos praktikos licencijų',
              'Veikla vykdoma neįsidiegus savikontrolės sistemos',
              'Neužtikrinami biologinės saugos reikalavimai',
              'Netinkamai tvarkomos atliekos',
              'Darbuotojų higienos įgūdžių pažeidimai',
              'Patalpos nehigieniškos, neatitinka nustatytų reikalavimų',
              'Netinkamos veterinarinių vaistų/pašarų laikymo sąlygos',
              'Kiti pažeidima',
            ]),
          }),

          q.location(14, 15, 'Nurodykite gyvūnų laikymo vietos adresą', {
            riskEvaluation: false,
          }),

          q.text(15, 19, 'Nurodykite gyvūno(-ų) laikytojus/globėjus', {
            required: false,
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      pages.informacija(
        16,
        {},
        {
          required: false,
        },
        {
          required: false,
        },
      ),

      // =======================================
      pages.aplinkybes(19, {
        required: true,
      }),

      // =======================================
      pages.vaizdine(20),

      // =======================================
      pages.teises(22),
    ],
  },

  // SURVEY 4
  {
    title: 'Maisto sukeltų protrukių pranešimas',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.417 47.25H38.917" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M27.667 47.25C33.0376 47.25 38.1883 45.1165 41.9859 41.3189C45.7835 37.5213 47.917 32.3706 47.917 27H7.41699C7.41699 32.3706 9.55047 37.5213 13.3481 41.3189C17.1457 45.1165 22.2964 47.25 27.667 47.25Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M26.2716 26.9998C24.9089 27.0125 23.5918 26.5095 22.5845 25.5917C21.5772 24.674 20.9541 23.4093 20.8402 22.0513C20.7263 20.6933 21.1301 19.3425 21.9705 18.2698C22.8109 17.197 24.0259 16.4817 25.3716 16.2673C25.1562 15.3138 25.2036 14.3197 25.5088 13.3911C25.814 12.4624 26.3655 11.634 27.1046 10.9942C27.8437 10.3545 28.7426 9.9273 29.7054 9.75834C30.6682 9.58937 31.6589 9.68492 32.5716 10.0348C32.9713 9.40562 33.4969 8.866 34.1154 8.44991C34.7338 8.03381 35.4317 7.75026 36.1651 7.61711C36.8985 7.48396 37.6515 7.50408 38.3768 7.67622C39.102 7.84835 39.7838 8.16878 40.3791 8.61731C41.4176 7.80106 42.7193 7.39377 44.0379 7.4725C45.3564 7.55122 46.6004 8.1105 47.5344 9.04452C48.4684 9.97854 49.0277 11.2225 49.1064 12.5411C49.1852 13.8596 48.7779 15.1613 47.9616 16.1998C48.4697 16.8747 48.8123 17.6593 48.962 18.4906C49.1117 19.3219 49.0643 20.1768 48.8236 20.9865C48.5829 21.7962 48.1556 22.5381 47.576 23.1526C46.9965 23.7671 46.2808 24.2371 45.4866 24.5248C45.6919 25.3347 45.715 26.18 45.5541 26.9998" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M29.917 27L38.917 18" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25.1921 16.3125C23.958 14.9969 22.3561 14.0836 20.5953 13.6916C18.8345 13.2996 16.9965 13.4471 15.3208 14.115C13.645 14.7828 12.2094 15.94 11.2009 17.4357C10.1925 18.9314 9.65797 20.6962 9.66711 22.5C9.66711 24.1425 10.1171 25.6725 10.8821 27" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    authType: SurveyAuthType.OPTIONAL,
    description:
      'Pranešimai apie ligų protrūkius, kurie įtariama, kad sukelti vartojant tam tikrus maisto produktus, taip pat kitus su maisto produktų vartojimu susijusius sveikatos pažeidimus.',
    pages: [
      // =======================================
      pages.kontaktiniai(3),

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date(4, 5, 'Nurodykite pranešamo įvykio datą'),
          q.datetime(
            5,
            6,
            'Nurodykite produkto sukėlusio sveikatos sutrikimus vartojimo datą ir laiką',
            {
              riskEvaluation: false,
            },
          ),
          q.datetime(6, 7, 'Nurodykite pirmųjų simptomų pasireiškimo datą ir laiką'),
          q.text(7, 8, 'Nurodykite pasireiškusius simptomus'),
          q.radio(8, 9, 'Ar maistas buvo vartojamas organizuotame renginyje?', {
            options: o(['Taip', 'Ne']),
          }),
          q.radio(9, 10, 'Ar kiti jums žinomi asmenys vartojo tą patį maistą?', {
            riskEvaluation: false,
            options: o(['Taip', 'Ne', 'Nežinau']),
          }),
          q.radio(
            10,
            11,
            'Ar kitiems jums žinomiems asmenims vartojusiems tą patį maistą taip pat pasireiškė simptomai?',
            {
              riskEvaluation: false,
              options: o(['Taip', 'Ne', 'Nežinau']),
            },
          ),
          q.text(11, 12, 'Nurodykite vartoto maisto pavadinimą', {
            riskEvaluation: false,
          }),
          q.text(12, 13, 'Nurodykite maisto gamintoją', {
            riskEvaluation: false,
          }),
          q.date(13, 14, 'Nurodykite produkto tinkamumo vartoti terminą', {
            required: false,
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      {
        ...pages.papildoma(),
        questions: [
          q.location(14, 15, 'Nurodykite produkto įsigijimo/vartojimo vietos adresą', {
            riskEvaluation: false,
          }),
          q.input(15, 16, 'Nurodykite vietos pavadinimą', { riskEvaluation: false }),
          q.text(16, 17, 'Nurodykite veiklą vykdančius fizinius ar juridinius asmenis', {
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      pages.aplinkybes(
        17,
        {
          required: true,
        },
        [
          q.radio(18, 19, 'Ar dėl kilusio sveikatos sutrikdymo kreipėtės į gydymo įstaigą?', {
            riskEvaluation: false,
            options: o(['Taip', 'Ne']),
          }),
          q.input(19, 20, 'Nurodykite sveikatos priežiūros įstaigos į kurią kreipėtės pavadinimą', {
            riskEvaluation: false,
          }),
        ],
      ),

      // =======================================
      pages.vaizdine(20),

      // =======================================
      pages.teises(22),
    ],
  },

  // SURVEY 5
  {
    title: 'Viešai tiekiamo geriamojo vande',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M34.2 49.5H19.8C18.6841 49.5062 17.6056 49.0975 16.7741 48.3532C15.9425 47.609 15.4172 46.5823 15.3 45.4725L11.25 6.75H42.75L38.6775 45.4725C38.5607 46.5784 38.0386 47.6019 37.2118 48.3457C36.385 49.0894 35.3121 49.5006 34.2 49.5Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.5 27C15.4473 25.5395 17.8158 24.75 20.25 24.75C22.6842 24.75 25.0527 25.5395 27 27C28.9473 28.4605 31.3158 29.25 33.75 29.25C36.1842 29.25 38.5527 28.4605 40.5 27" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    authType: SurveyAuthType.REQUIRED,
    description:
      'Pranešimai apie viešai tiekiamo geriamojo vandens neatitikimus kokybės ar saugos normoms.',
    pages: [
      // =======================================
      pages.kontaktiniai(2, {}, [
        q.input(3, 4, 'Prašome nurodyti savo kontaktinį telefono numerį', {
          riskEvaluation: false,
          authRelation: AuthRelation.PHONE,
        }),
      ]),

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date(4, 5, 'Nurodykite pranešamo įvykio datą', {
            riskEvaluation: false,
          }),
          q.location(5, 6, 'Nurodykite vandens tiekimo vietos adresą', { riskEvaluation: false }),
        ],
      },

      // =======================================
      pages.aplinkybes(6, {
        required: true,
      }),

      // =======================================
      pages.vaizdine(7),

      // =======================================
      pages.teises(9),
    ],
  },

  // SURVEY 6
  {
    title: 'Rastų gaišenų pranešimai',
    icon: `<svg viewBox="0 0 55 54" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.3418 49.5V43.4925C15.3418 40.32 16.6018 37.26 18.8518 35.01C21.1018 32.76 24.1618 31.5 27.3343 31.5C33.9718 31.5 39.3268 36.8775 39.3268 43.4925V49.5H15.3418Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M44.5918 38.9927V34.4927" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M4.83398 49.5001H15.3415V44.2576L4.83398 39.0151V49.5226V49.5001Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.8518 35.01L15.3418 31.5L18.3343 28.5075L16.8268 27" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M15.3418 49.4999C15.3418 47.9024 15.9718 46.3724 17.0968 45.2474C18.2218 44.1224 19.7518 43.4924 21.3268 43.4924C21.3268 40.1849 24.0043 37.4849 27.3343 37.4849C33.9493 37.4849 39.3268 42.8624 39.3268 49.4774H15.3193L15.3418 49.4999Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M49.8336 44.2576C49.8336 41.3551 47.4936 39.0151 44.5911 39.0151C41.6886 39.0151 39.3486 41.3551 39.3486 44.2576V49.5001H44.5911C47.4936 49.5001 49.8336 47.1601 49.8336 44.2576Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M30.1243 19.3277L39.7318 23.5352C42.9268 24.9302 46.6393 23.4677 48.0343 20.2952C49.4293 17.1002 47.9668 13.3877 44.7943 11.9927L35.1868 7.78517C31.9918 6.39017 28.2793 7.85267 26.8843 11.0252C25.4893 14.2202 26.9518 17.9327 30.1243 19.3277Z" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M42.2736 17.7524C41.1261 15.8399 39.2586 15.1874 37.0761 15.6374C35.1411 16.0424 33.5886 15.2099 32.6436 13.5449" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M26.8612 11.025L24.1387 9.85498" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M27.2661 16.8525L24.7461 18.405" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M43.4893 23.9399L44.0743 26.8424" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M48.0342 20.2725L50.7567 21.465" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M47.6289 14.4675L50.1714 12.915" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M31.4063 7.38008L30.8213 4.45508" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M34.9161 21.4873L33.7236 24.2098" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M39.9561 9.78744L41.1486 7.06494" stroke="#2671D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
    authType: SurveyAuthType.NONE,
    description:
      'Pranešimai apie pastebėtas laukinių gyvūnų gaišenas, galimai susijusias su plintančiomis gyvūnų ligomis, pranešimai apie pastebėtas ūkinių gyvūnų gaišenas.',

    pages: [
      // =======================================
      pages.kontaktiniai(1, {
        required: false,
        riskEvaluation: false,
      }),

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date(2, 3, 'Nurodykite pranešamo įvykio datą'),

          q.multiselect(3, undefined, 'Pasirinkite kokią gaišeną radote', {
            riskEvaluation: false,
            options: [
              os('Paukštis', 4),
              os('Šernas', 4),
              os('Lapė', 4),
              os('Ūsūrinis šuo', 4),
              os('Ūkinis gyvūnas', 4),
              os('Gyvūnas augintinis', 4),
              os('Kita', '3.1'),
            ],
          }),

          q.input('3.1', 4, 'Įveskite pavadinimą', {
            riskEvaluation: false,
            condition: c(3),
          }),

          q.location(4, 5, 'Nurodykite gaišenos radimo vietą', {
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      {
        ...pages.papildoma(),
        questions: [
          q.text(5, 6, 'Pateikite papildomą informaciją', {
            riskEvaluation: false,
          }),
        ],
      },

      // =======================================
      {
        ...pages.vaizdine(6),
        questions: [
          q.files(6, undefined, 'Pridėkite vaizdinę ar kitą medžiagą', {
            required: false,
            riskEvaluation: false,
          }),
        ],
      },
    ],
  },
];

@Service({
  name: 'seed',
})
export default class SeedService extends moleculer.Service {
  @Method
  async seedSurveys(surveys: SurveyTemplate[]) {
    for (const surveyItem of surveys) {
      const { pages, ...surveyData } = surveyItem;
      const questionByExcelId: Record<string, Partial<Question<'options'>>> = {};
      let firstPage: Page['id'];

      // 1 - first step: create pages with partial questions
      for (const { questions = [], ...pageData } of pages) {
        const page: Page = await this.broker.call('pages.create', pageData);

        firstPage ||= page.id;

        for (const item of questions) {
          const { options, id: excelId, nextQuestion, condition, ...questionData } = item;

          const question: Question = await this.broker.call('questions.create', {
            ...questionData,
            priority: questions.length - questions.indexOf(item),
            page: page.id,
          });

          questionByExcelId[excelId] = question;
        }
      }

      // 2 - second step: create survey
      const survey: Survey = await this.broker.call('surveys.create', {
        ...surveyData,
        priority: surveys.length - surveys.indexOf(surveyItem),
        firstPage,
      });

      // 3 - third step: update questions missing data and options
      for (const { questions = [] } of pages) {
        for (const { options = [], id: excelId, nextQuestion, condition } of questions) {
          const question: Question<'options'> = await this.broker.call('questions.update', {
            id: questionByExcelId[excelId].id,
            survey: survey.id,
            nextQuestion: nextQuestion ? questionByExcelId[nextQuestion].id : undefined,
            condition: condition
              ? {
                  question: questionByExcelId[condition.question].id,
                  value:
                    condition.value ||
                    questionByExcelId[condition.question].options.find(
                      (o) => o.nextQuestion === questionByExcelId[excelId].id,
                    ).id,
                }
              : undefined,
          });

          question.options = [];
          for (const optionItem of options) {
            const { nextQuestion, ...optionData } = optionItem;
            if (nextQuestion && !questionByExcelId[nextQuestion]) {
              console.error(nextQuestion, survey, excelId);
            }
            const option: QuestionOption = await this.broker.call('questionOptions.create', {
              ...optionData,
              question: question.id,
              priority: options.length - options.indexOf(optionItem),
              nextQuestion: nextQuestion ? questionByExcelId[nextQuestion].id : undefined,
            });

            question.options.push(option);
          }

          questionByExcelId[excelId] = question;
        }
      }
    }
  }

  @Action()
  async run() {
    await this.broker.waitForServices(['surveys', 'pages', 'questions', 'questionOptions']);
    const count: number = await this.broker.call('surveys.count');

    if (!count) {
      await this.seedSurveys(SURVEYS_SEED);
    }
  }
}
