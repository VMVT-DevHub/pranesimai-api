'use strict';

import moleculer from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Survey, SurveyAuthType } from './surveys.service';
import { Page } from './pages.service';
import { AuthRelation, Question, QuestionType } from './questions.service';
import { QuestionOption } from './questionOptions.service';

type SurveyTemplate = {
  title: Survey['title'];
  description: Survey['description'];
  icon: Survey['icon'];
  authType: SurveyAuthType;
  pages: Array<{
    title: Page['title'];
    description: Page['description'];
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
    description: 'TODO',
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
    description: 'TODO',
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

const FAKE_ICON =
  '<svg aria-hidden="true" focusable="false" class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><!-- Font Awesome Free 5.15.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"/></svg>';

const SURVEYS_SEED: SurveyTemplate[] = [
  // SURVEY 1
  {
    title: 'Maisto srities pranešimų anketa',
    description: 'TODO: Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
    icon: FAKE_ICON,
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
    description: 'TODO: Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
    icon: FAKE_ICON,
    authType: SurveyAuthType.OPTIONAL,
    pages: [
      // =======================================
      pages.kontaktiniai(3),

      // =======================================
      {
        ...pages.tema(),
        questions: [
          q.select(4, 5, 'Pasirinkite dėl ko pranešate', {
            riskEvaluation: false,
            options: o([
              'Dėl įsigytų pašarų',
              'Dėl pastebėtų prekybos vietoje pašarų',
              'Dėl įsigytų veterinarinių vaistų',
              'Dėl pastebėtų prekybos vietoje veterinarinių vaistų',
            ]),
          }),
        ],
      },

      // =======================================
      {
        ...pages.detales(),
        questions: [
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
          q.date(11, 12, 'Nurodykite produktų tinkamumo vartoti terminą', {
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
    description: 'TODO',
    icon: FAKE_ICON,
    authType: SurveyAuthType.OPTIONAL,
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
              os('Dėl pašarų gamybos veiklos', '4.13'),
              os('Dėl pašarų prekybos veiklos', '4.13'),
              os('Dėl šalutinių gyvūninių produktų tvarkymo veiklos', '4.13'),
              os('Dėl Ūkininkavimo veiklos', '4.13'),
              os('Dėl veterinarinių vaistų gamybos veiklos', '4.13'),
              os('Dėl veterinarinių vaistų prekybos veiklos', '4.13'),
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
    description: 'TODO',
    icon: FAKE_ICON,
    authType: SurveyAuthType.OPTIONAL,
    pages: [
      // =======================================
      pages.kontaktiniai(3),

      // =======================================
      {
        ...pages.detales(),
        questions: [
          q.date(4, 5, 'Nurodykite pranešamo įvykio datą'),
          q.date(
            5,
            6,
            'Nurodykite produkto sukėlusio sveikatos sutrikimus vartojimo datą ir laiką',
            {
              riskEvaluation: false,
            },
          ),
          q.date(6, 7, 'Nurodykite pirmųjų simptomų pasireiškimo datą ir laiką'),
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
    description: 'TODO',
    icon: FAKE_ICON,
    authType: SurveyAuthType.REQUIRED,
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
    description: 'TODO',
    icon: FAKE_ICON,
    authType: SurveyAuthType.NONE,
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
              os('Kita (galima įrašyti iškarto', '3.1'),
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
      for (const [index, { questions = [], ...pageData }] of Object.entries(pages)) {
        const page: Page = await this.broker.call('pages.create', <Partial<Page>>{
          ...pageData,
          progress: {
            current: Number(index) + 1,
            total: pages.length,
          },
        });

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
