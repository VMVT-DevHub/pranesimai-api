'use strict';

import moleculer from 'moleculer';
import { Action, Method, Service } from 'moleculer-decorators';
import { Survey } from './surveys.service';
import { Page, PageType } from './pages.service';
import { Question, QuestionType } from './questions.service';
import { QuestionOption } from './questionOptions.service';

type PartialOption = Partial<QuestionOption>;

type PartialQuestion = Partial<
  Omit<Question, 'options'> & {
    options: Array<
      | PartialOption
      | ((params: {
          prevOption?: QuestionOption;
          options: QuestionOption[];
          question: Question;
        }) => PartialOption)
    >;
  }
>;

type PartialPage = Partial<
  Omit<Page, 'questions'> & {
    questions: Array<
      | PartialQuestion
      | ((params: {
          prevQuestion?: Question<'options'>;
          questions: Array<Question<'options'>>;
          page: Page;
        }) => PartialQuestion)
    >;
  }
>;

const FAKE_ICON =
  '<svg aria-hidden="true" focusable="false" class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1em" height="1em"><!-- Font Awesome Free 5.15.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) --><path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"/></svg>';

@Service({
  name: 'seed',
})
export default class SeedService extends moleculer.Service {
  @Method
  async pasaruSurvey() {
    //    const firstPage = await this.page({
    //      title: 'Kokiu būdu pranešite?',
    //      description: 'Pasirinkite kaip pateiksite pranešimą',
    //    });

    const firstPage = await this.page({
      title: 'Pranešimo tema',
      description: 'Pasirinkite, dėl ko teikiate pranešimą',
    });

    const lastPage = await this.page({
      title: 'Dėkojame',
      description: 'Jūsų informacija sėkmingai pateikta',
    });

    const { id: survey } = await this.survey({
      title: 'Pašarų ar veterinarijos vaistų pranešimas',
      description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      icon: FAKE_ICON,
      firstPage: firstPage.id,
      lastPage: lastPage.id,
    });

    // Survey pages - from last to first
    let nextQuestion: Question['id'];

    // =======================================
    ({
      questions: {
        [0]: { id: nextQuestion },
      },
    } = await this.pageWithQuestions({
      title: 'Jūsų teisės, pareigos ir atsakomybės',
      description: 'Sutikimas',
      questions: [
        {
          survey,
          type: QuestionType.CHECKBOX,
          required: true,
          riskEvaluation: true,
          title: 'Patvirtinu kad susipažinau su pranešimų pateikimo VMVT tvarka',
        },
        {
          survey,
          type: QuestionType.CHECKBOX,
          required: true,
          riskEvaluation: true,
          title:
            'Patvirtinu, kad esu susipažinęs su teisinėmis pasekmėmis už melagingos informacijos teikimą, o mano teikiama informacija yra teisinga.',
        },
      ],
    }));

    // =======================================
    ({
      questions: {
        [0]: { id: nextQuestion },
      },
    } = await this.pageWithQuestions({
      title: 'Vaizdinė medžiaga ir kiti dokumentai',
      description:
        'Pridėkite vaizdinę medžiagą (nuotraukas, video) arba kitus dokumentus įrodančius pateikiamus',
      questions: [
        {
          survey,
          type: QuestionType.RADIO,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Ar galite pateikti įrodymų apie pranešamus pažeidimus?',
          options: [{ title: 'Taip' }, { title: 'Ne' }],
        },

        ({ prevQuestion }) => ({
          survey,
          type: QuestionType.FILES,
          nextQuestion,
          required: true,
          riskEvaluation: false,
          title: 'Pridėkite vaizdinę ar  kitą medžiagą',
          condition: {
            question: prevQuestion.id,
            value: prevQuestion.options[0].id,
          },
        }),
      ],
    }));

    // =======================================
    ({
      questions: {
        [0]: { id: nextQuestion },
      },
    } = await this.pageWithQuestions({
      title: 'Veiklos informacija',
      description: 'Pateikite papildomą informaciją',
      questions: [
        {
          survey,
          type: QuestionType.LOCATION,
          nextQuestion,
          required: true,
          riskEvaluation: false,
          title: 'Nurodykite veiklos vietos adresą',
          hint: 'Nurodyti vietą žemėlapyje',
        },
        {
          survey,
          type: QuestionType.INPUT,
          nextQuestion,
          required: true,
          riskEvaluation: false,
          title: 'Nurodykite veiklos pavadinimą',
        },
        {
          survey,
          type: QuestionType.TEXT,
          nextQuestion,
          required: false,
          riskEvaluation: false,
          title: 'Nurodykite veiklą vykdančius fizinius ar juridinius asmenis',
        },
      ],
    }));

    // =======================================
    ({
      questions: {
        [0]: { id: nextQuestion },
      },
    } = await this.pageWithQuestions({
      title: 'Pranešimo detalės',
      description: 'Pateikite išsamią informaciją',
      questions: [
        {
          survey,
          type: QuestionType.DATE,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Nurodykite produktų įsigijimo datą',
        },
        {
          survey,
          type: QuestionType.MULTISELECT,
          nextQuestion,
          required: true,
          riskEvaluation: false,
          title: 'Pasirinkite apie kokius produkto pažeidimus pranešate',
          options: [
            { title: 'Kokybės pažeidimai' },
            { title: 'Ženklinimo pažeidimai' },
            { title: 'Tinkamumo vartoti terminų pažeidimai' },
            { title: 'Produktų klastotės' },
            { title: 'Neleistinos sudedamosios dalys' },
            { title: 'Kainų, kiekių, tūrio, svorio neatitikimai' },
            { title: 'Neregistruotas veterinarinis vaistas' },
            { title: 'Alergenų informacijos pateikimo pažeidimai' },
            { title: 'Prekiaujama neleistinais produktais' },
            {
              title:
                'Produktas užterštas cheminiais, fiziniais, mikrobiniais ar kitokiais teršalais',
            },
            { title: 'Netinkamos veterinarinių vaistų/pašarų laikymo sąlygos' },
            { title: 'Kiti pažeidimai' },
          ],
        },
        {
          survey,
          type: QuestionType.INPUT,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Nurodykite produkto pavadinimą',
          hint: 'Nurodykite tikslų produkto pavadinimą (pvz. varškės sūrelis "XXXX")',
        },
        {
          survey,
          type: QuestionType.RADIO,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Ar galite pateikti įrodymų apie pranešamus pažeidimus?',
          options: [{ title: 'Taip' }, { title: 'Ne' }],
        },
        ({ prevQuestion }) => ({
          survey,
          type: QuestionType.INPUT,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Produkto gamintojas',
          condition: {
            question: prevQuestion.id,
            value: prevQuestion.options[0].id,
          },
        }),
        {
          survey,
          type: QuestionType.RADIO,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Ar galite pateikti įrodymų apie pranešamus pažeidimus?',
          options: [{ title: 'Taip' }, { title: 'Ne' }],
        },
        ({ prevQuestion }) => ({
          survey,
          type: QuestionType.INPUT,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Produkto importuotojas',
          condition: {
            question: prevQuestion.id,
            value: prevQuestion.options[0].id,
          },
        }),
        {
          survey,
          type: QuestionType.DATE,
          nextQuestion,
          required: true,
          riskEvaluation: true,
          title: 'Nurodykite produktų tinkamumo vartoti terminą',
        },
      ],
    }));

    //    // =======================================
    //    const {
    //      questions: {
    //        [0]: { id: startingQuestion },
    //      },
    //    } = await this.pageWithQuestions({
    //      title: 'Pranešimo tema',
    //      description: 'Pasirinkite, dėl ko teikiate pranešimą',
    //      questions: [
    //        {
    //          survey,
    //          type: QuestionType.SELECT,
    //          nextQuestion,
    //          required: true,
    //          riskEvaluation: false,
    //          title: 'Pasirinkite dėl ko pranešate',
    //          options: [
    //            { title: 'Dėl įsigytų pašarų' },
    //            { title: 'Dėl pastebėtų prekybos vietoje pašarų' },
    //            { title: 'Dėl įsigytų veterinarinių vaistų' },
    //            { title: 'Dėl pastebėtų prekybos vietoje veterinarinių vaistų' },
    //          ],
    //        },
    //      ],
    //    });

    //    // =======================================
    //    const {
    //      questions: {
    //        [0]: { id: emailQuestion },
    //      },
    //    } = await this.pageWithQuestions({
    //      title: 'Kontaktiniai duomenys',
    //      description: 'Patikslinkite savo kontaktinius duomenis',
    //      questions: [
    //        {
    //          survey,
    //          type: QuestionType.EMAIL,
    //          nextQuestion: startingQuestion,
    //          required: true,
    //          riskEvaluation: false,
    //          title: 'El. pašto adresas',
    //        },
    //      ],
    //    });
    //
    //    // =======================================
    //    await this.questionWithOptions({
    //      survey,
    //      type: QuestionType.AUTH,
    //      required: true,
    //      riskEvaluation: false,
    //      page: firstPage.id,
    //      data: {
    //        relatedQuestion: emailQuestion,
    //      },
    //      options: [
    //        {
    //          title: 'Anonimiškai',
    //          description:
    //            'Jūsų pranešimas bus nagrinėjamas, tačiau Jūs nebūsite informuotas apie įvykio nagrinėjimo eigą ir priimtus sprendimus.',
    //          icon: FAKE_ICON,
    //          nextQuestion: startingQuestion,
    //          data: {
    //            auth: false,
    //          },
    //        },
    //        {
    //          title: 'Autentifikuosiu save per  e. valdžios vartus',
    //          description:
    //            'Jūsų pranešimas bus nagrinėjamas ir informuosime apie įvykio nagrinėjimo eigą ir priimtus sprendimus elektroniniu paštu.',
    //          icon: FAKE_ICON,
    //          nextQuestion: emailQuestion,
    //          data: {
    //            auth: true,
    //          },
    //        },
    //      ],
    //    });

    // =======================================
    await this.questionWithOptions({
      survey,
      page: firstPage.id,
      type: QuestionType.SELECT,
      nextQuestion,
      required: true,
      riskEvaluation: false,
      title: 'Pasirinkite dėl ko pranešate',
      options: [
        { title: 'Dėl įsigytų pašarų' },
        { title: 'Dėl pastebėtų prekybos vietoje pašarų' },
        { title: 'Dėl įsigytų veterinarinių vaistų' },
        { title: 'Dėl pastebėtų prekybos vietoje veterinarinių vaistų' },
      ],
    });
  }

  @Method
  survey(data: Partial<Survey>): Promise<Survey> {
    return this.broker.call('surveys.create', data);
  }

  @Method
  page(data: Partial<Page>): Promise<Page> {
    return this.broker.call('pages.create', data);
  }

  @Method
  async pageWithQuestions(data: PartialPage): Promise<Page<'questions'>> {
    const { questions: questionsToCreate, ...pageData } = data;
    const page = await this.page(pageData);
    const questions: Array<Question<'options'>> = [];
    let prevQuestion: Question<'options'>;

    if (questionsToCreate) {
      for (const dataOrCallback of questionsToCreate) {
        const data =
          typeof dataOrCallback === 'function'
            ? dataOrCallback({ prevQuestion, questions, page })
            : dataOrCallback;

        const question: Question<'options'> = await this.questionWithOptions({
          ...data,
          page: page.id,
        });

        questions.push(question);
        prevQuestion = question;
      }
    }

    return {
      ...page,
      questions,
    };
  }

  @Method
  question(data: Partial<Question>): Promise<Question> {
    return this.broker.call('questions.create', data);
  }

  @Method
  async questionWithOptions(data: PartialQuestion): Promise<Question<'options'>> {
    const { options: optionsToCreate, ...questionData } = data;
    const options: QuestionOption[] = [];
    let prevOption: QuestionOption;

    const question = await this.question(questionData);

    if (optionsToCreate) {
      for (const dataOrCallback of optionsToCreate) {
        const data =
          typeof dataOrCallback === 'function'
            ? dataOrCallback({ prevOption, options, question })
            : dataOrCallback;

        const option = await this.questionOption({
          ...data,
          question: question.id,
        });

        options.push(option);
        prevOption = option;
      }
    }

    return {
      ...question,
      options,
    };
  }

  @Method
  questionOption(data: Partial<QuestionOption>): Promise<QuestionOption> {
    return this.broker.call('questionOptions.create', data);
  }

  @Action()
  async run() {
    await this.broker.waitForServices(['surveys', 'pages', 'questions', 'questionOptions']);
    const count: number = await this.broker.call('surveys.count');

    if (!count) {
      await this.pasaruSurvey();
    }
  }
}
