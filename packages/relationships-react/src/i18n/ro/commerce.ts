export const crmUiRoCommerceMessages = {
  createActivityDialog: {
    title: "Activitate noua",
    description: "Inregistreaza un apel, email, intalnire sau sarcina.",
    fields: {
      subject: "Subiect",
      type: "Tip",
      status: "Status",
      description: "Descriere",
      linkTo: "Leaga de",
      entityId: "Entitate",
    },
    placeholders: {
      subject: "Apel de descoperire cu Acme",
      entityId: "Cauta sau insereaza o referinta",
    },
    validation: {
      subjectRequired: "Subiectul este obligatoriu",
      createFailed: "Crearea activitatii a esuat",
    },
  },
  createQuoteDialog: {
    title: "Oferta noua",
    fields: {
      title: "Titlu",
      stage: "Etapa",
    },
    placeholders: {
      title: "Oferta noua",
      stage: "Selecteaza etapa...",
    },
    validation: {
      titleRequired: "Titlul este obligatoriu",
      stageRequired: "Etapa este obligatorie",
      createFailed: "Crearea ofertei a esuat",
    },
  },
  quotesBoard: {
    fallbackName: "Etapa fara nume",
  },
  quoteSummaryCard: {
    unknown: "Necunoscut",
    expectedClose: "Inchidere estimata",
  },
  inlineEditor: {
    failedToSave: "Salvarea a esuat.",
    notSet: "Nesetat",
    selectPlaceholder: "Selecteaza...",
    noneOption: "Niciunul",
    invalidNumber: "Introdu un numar valid.",
    minNumber: "Trebuie sa fie cel putin {min}.",
    maxNumber: "Trebuie sa fie cel mult {max}.",
    searchCurrencyPlaceholder: "Cauta moneda...",
    noCurrenciesFound: "Nu au fost gasite monede.",
    searchLanguagePlaceholder: "Cauta limba...",
    noLanguagesFound: "Nu au fost gasite limbi.",
    addTemplate: "Adauga {label}",
    addTagPlaceholder: "Adauga eticheta...",
    tagAlreadyAdded: "Eticheta este deja adaugata.",
    addTagFailed: "Adaugarea etichetei a esuat.",
    removeTagFailed: "Stergerea etichetei a esuat.",
  },
  createQuoteVersionDialog: {
    title: "Versiune de oferta noua",
    fields: {
      quote: "Oferta",
      currency: "Moneda",
      validUntil: "Valabila pana la",
    },
    placeholders: {
      searchQuotes: "Cauta oferte...",
      selectCurrency: "Selecteaza moneda...",
      pickDate: "Alege o data",
    },
    empty: {
      loading: "Se incarca...",
      noQuotes: "Nu au fost gasite oferte.",
    },
    validation: {
      selectQuote: "Selecteaza o oferta",
      selectCurrency: "Selecteaza o moneda",
      createFailed: "Crearea versiunii de oferta a esuat",
    },
    actions: {
      create: "Creeaza",
    },
  },
  quoteVersionLinesCard: {
    title: "Linii versiune oferta",
    empty: "Nu exista inca linii.",
    fields: {
      description: "Descriere",
      quantity: "Cant.",
      priceCents: "Pret",
    },
    validation: {
      descriptionRequired: "Descrierea este obligatorie",
      addFailed: "Adaugarea liniei a esuat",
    },
    subtotal: "Subtotal",
  },
  activitiesPage: {
    title: "Activitati",
    description: "Apeluri, emailuri, intalniri, sarcini si urmariri din CRM-ul tau.",
    create: "Activitate noua",
    filters: {
      type: "Tip",
      status: "Status",
      allTypes: "Toate tipurile",
      allStatuses: "Toate statusurile",
    },
    empty: "Nicio activitate nu corespunde filtrelor.",
  },
  quoteVersionsPage: {
    title: "Versiuni oferta",
    description: "Versiuni emise pentru ofertele din pipeline.",
    create: "Versiune oferta noua",
    filters: {
      status: "Status",
      allStatuses: "Toate statusurile",
    },
    columns: {
      quoteVersion: "Versiune",
      status: "Status",
      total: "Total",
      validUntil: "Valabila pana la",
      updated: "Actualizat",
    },
    loadFailed: "Incarcarea ofertelor a esuat.",
    empty: "Nu au fost gasite oferte.",
  },
  customFields: {
    page: {
      title: "Campuri personalizate",
      description:
        "Gestioneaza campurile CRM de runtime pe care operatorii le pot adauga fara modificari de cod.",
      addField: "Adauga camp",
      entityFilterLabel: "Entitate",
      allEntities: "Toate entitatile",
      loadFailed: "Nu s-au putut incarca campurile personalizate.",
      requestFailed: "Cererea a esuat.",
      emptyTitle: "Niciun camp personalizat inca",
      emptyDescription:
        "Adauga o definitie de camp pentru a colecta date structurate despre persoane, organizatii, oferte sau activitati.",
      requiredBadge: "Obligatoriu",
      searchableBadge: "Cautabil",
      optionCount: "{count} optiuni",
      edit: "Editeaza",
      delete: "Sterge",
      deleteTitle: "Stergi campul personalizat?",
      deleteDescription:
        'Aceasta elimina definitia pentru "{label}". Valorile deja stocate pentru aceasta cheie nu vor mai fi expuse de API-ul de campuri personalizate.',
      deleteConfirm: "Sterge",
    },
    sheet: {
      editTitle: "Editeaza campul personalizat",
      createTitle: "Camp personalizat nou",
      fields: {
        entity: "Entitate",
        fieldType: "Tip de camp",
        label: "Eticheta",
        key: "Cheie",
        searchable: "Cautabil",
        searchableDescription:
          "Include acest camp in fluxurile de cautare si filtrare pe campuri personalizate.",
        options: "Optiuni",
        optionsDescription:
          "Etichetele sunt afisate operatorilor; valorile sunt stocate in JSON-ul campurilor personalizate.",
      },
      placeholders: {
        label: "Sursa lead",
        optionLabel: "Eticheta",
      },
      actions: {
        addOption: "Adauga optiune",
        create: "Creeaza camp",
      },
      validation: {
        labelRequired: "Eticheta este obligatorie.",
        keyRequired: "Cheia este obligatorie.",
        optionsRequired: "Adauga cel putin o optiune cu eticheta si valoare.",
      },
    },
    fieldTypeLabels: {
      varchar: "Text scurt",
      text: "Text lung",
      double: "Numar",
      monetary: "Valoare monetara",
      date: "Data",
      boolean: "Da/nu",
      enum: "Alegere unica",
      set: "Alegere multipla",
      json: "JSON",
      address: "Adresa",
      phone: "Telefon",
    },
  },
} as const
