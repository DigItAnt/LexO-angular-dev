// rdf-export.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DataFactory, Parser, Quad, Writer, NamedNode, Literal } from 'n3';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class RdfService {
  private rdfUrl =
    'https://digitant.ilc.cnr.it/graphdb10_itant/repositories/ItAnt/statements?infer=false';

  // Definizione dei namespace per il lessico
  private lexicalNamespaces = {
    lex: 'http://digitant.ilc.cnr.it/data/lexicon#',
    lexbib: 'http://digitant.ilc.cnr.it/data/lexicon/bibliography#',
    ontolex: 'http://www.w3.org/ns/lemon/ontolex#',
    lexinfo: 'http://www.lexinfo.net/ontology/3.0/lexinfo#',
    itant: 'https://www.prin-italia-antica.unifi.it#',
    ety: 'http://lari-datasets.ilc.cnr.it/lemonEty#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    skos: 'http://www.w3.org/2004/02/skos/core#',
    ns: 'http://www.w3.org/2003/06/sw-vocab-status/ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    dcterms: 'http://purl.org/dc/terms/',
    owl: 'http://www.w3.org/2002/07/owl#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
  };

  // Definizione dei namespace per i campi semantici
  private semanticNamespaces = {
    dc: 'http://purl.org/dc/elements/1.1/',
    dct: 'http://purl.org/dc/terms/',
    digitant_sem_fields: 'https://vocabs.ilc4clarin.ilc.cnr.it/vocabularies/digitant_sem_fields/',
    iso369_3: 'http://iso639-3.sil.org/code/',
    ontolex: 'http://www.w3.org/ns/lemon/ontolex#',
    owl: 'http://www.w3.org/2002/07/owl#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    skos: 'http://www.w3.org/2004/02/skos/core#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', // Aggiunto
  };

  // Tipi da processare per il lessico
  private lexicalTypesToProcess: string[] = [
    this.lexicalNamespaces.ontolex + 'LexicalEntry',
    this.lexicalNamespaces.ontolex + 'Word',
    this.lexicalNamespaces.ontolex + 'Form',
    this.lexicalNamespaces.ontolex + 'LexicalSense',
    this.lexicalNamespaces.ontolex + 'MultiWordExpression',
    this.lexicalNamespaces.ety + 'Etymon',
    this.lexicalNamespaces.ety + 'Etymology',
    this.lexicalNamespaces.ety + 'EtyLink',
    this.lexicalNamespaces.ontolex + 'LexicalConcept',
    this.lexicalNamespaces.rdf + 'Description',
    this.lexicalNamespaces.skos + 'narrower',
  ];

  // Tipi da processare per i campi semantici
  private semanticTypesToProcess: string[] = [
    this.semanticNamespaces.ontolex + 'LexicalConcept',
  ];

  constructor(private http: HttpClient) {}

  // Metodo per ottenere i dati RDF in formato Trig
  getRDFResource(): Observable<string> {
    const headers = new HttpHeaders({
      Accept: 'application/x-trig',
    });

    return this.http.get(this.rdfUrl, { headers, responseType: 'text' });
  }

  // Funzione per sostituire l'IRI di un elemento se ha il prefisso da cambiare
  private replaceBase(uri: string, isSemantic: boolean = false): string {
    if (uri.includes('http://lexica/mylexicon#')) {
      return uri.replace(
        'http://lexica/mylexicon#',
        isSemantic ? this.semanticNamespaces.digitant_sem_fields : this.lexicalNamespaces.lex
      );
    } else if (uri.includes('http://lexica/mylexicon/bibliography#')) {
      return uri.replace(
        'http://lexica/mylexicon/bibliography#',
        isSemantic ? this.semanticNamespaces.digitant_sem_fields : this.lexicalNamespaces.lexbib
      );
    }
    return uri;
  }

  // Funzione per ottenere i tipi di un soggetto
  private getTypesOfSubject(subject: NamedNode, quads: Quad[]): string[] {
    return quads
      .filter(
        (quad) =>
          quad.subject.equals(subject) &&
          quad.predicate.value === this.lexicalNamespaces.rdf + 'type'
      )
      .map((quad) => quad.object.value);
  }

  // Funzione per generare una chiave unica per un quad
  private quadToKey(quad: Quad): string {
    const subject = quad.subject.value;
    const predicate = quad.predicate.value;
    let object: string;

    if (quad.object.termType === 'NamedNode') {
      object = quad.object.value;
    } else if (quad.object.termType === 'Literal') {
      object = `"${quad.object.value}"`;
      if (quad.object.language) {
        object += `@${quad.object.language}`;
      } else if (
        quad.object.datatype &&
        quad.object.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string'
      ) {
        object += `^^<${quad.object.datatype.value}>`;
      }
    } else {
      object = quad.object.value;
    }

    return `${subject} ${predicate} ${object}`;
  }

  // Funzione per processare i nodi e le loro proprietà per il lessico
  private processNode(
    subject: NamedNode,
    sourceQuads: Quad[],
    mainQuads: Map<string, Quad>,
    processedNodes: Set<string>
  ): void {
    const subjectValue = subject.value;

    // Evita cicli infiniti
    if (processedNodes.has(subjectValue)) {
      return;
    }
    processedNodes.add(subjectValue);

    const newSubject = DataFactory.namedNode(this.replaceBase(subjectValue));

    // Ottieni tutti i quads con questo soggetto
    const quads = sourceQuads.filter((q) => q.subject.equals(subject));

    quads.forEach((quad) => {
      const predicate = quad.predicate;
      const object = quad.object;

      // Non processare ulteriormente se il soggetto è una classe dello schema
      if (
        (subject.value.startsWith('http://www.w3.org/') ||
          subject.value.startsWith('http://purl.org/')) &&
        !this.lexicalTypesToProcess.includes(subject.value)
      ) {
        return;
      }

      // Non processare ulteriormente se l'oggetto è una classe dello schema
      if (
        object.termType === 'NamedNode' &&
        (object.value.startsWith('http://www.w3.org/') ||
          object.value.startsWith('http://purl.org/')) &&
        !this.lexicalTypesToProcess.includes(object.value)
      ) {
        return;
      }

      if (predicate.value === this.lexicalNamespaces.skos + 'narrower') {
        // Gestione specifica per skos:narrower

        // Sostituisci l'URI nell'oggetto se necessario
        const newObject = DataFactory.namedNode(this.replaceBase(object.value));

        // Aggiungi (new_object, skos:narrower, new_subject)
        const narrowerQuad = DataFactory.quad(
          newObject,
          DataFactory.namedNode(this.semanticNamespaces.skos + 'narrower'), // Modifica: Usa semanticNamespaces.skos
          newSubject
        );
        const narrowerQuadKey = this.quadToKey(narrowerQuad);
        if (!mainQuads.has(narrowerQuadKey)) {
          mainQuads.set(narrowerQuadKey, narrowerQuad);
        }

        // Aggiungi (new_subject, skos:broader, new_object)
        const broaderQuad = DataFactory.quad(
          newSubject,
          DataFactory.namedNode(this.semanticNamespaces.skos + 'broader'), // Modifica: Usa semanticNamespaces.skos
          newObject
        );
        const broaderQuadKey = this.quadToKey(broaderQuad);
        if (!mainQuads.has(broaderQuadKey)) {
          mainQuads.set(broaderQuadKey, broaderQuad);
        }
      } else {
        // Gestione regolare per le altre proprietà

        // Sostituisci l'URI nell'oggetto se necessario
        const newObject =
          object.termType === 'NamedNode'
            ? DataFactory.namedNode(this.replaceBase(object.value))
            : object;

        // Aggiungi il quad al grafo principale
        const newQuad = DataFactory.quad(newSubject, predicate, newObject);
        const quadKey = this.quadToKey(newQuad);

        if (!mainQuads.has(quadKey)) {
          mainQuads.set(quadKey, newQuad);
        }

        // Se l'oggetto è un URI e il suo rdf:type è tra i tipi da processare, processalo
        if (newObject.termType === 'NamedNode') {
          const objectTypes = this.getTypesOfSubject(newObject, sourceQuads);
          const shouldProcessObject = objectTypes.some((type) =>
            this.lexicalTypesToProcess.includes(type)
          );

          if (shouldProcessObject) {
            this.processNode(newObject, sourceQuads, mainQuads, processedNodes);
          }
        }
      }
    });
  }

  // Funzione per processare i nodi e le loro proprietà per i campi semantici
  private processSemanticNode(
    subject: NamedNode,
    sourceQuads: Quad[],
    mainQuads: Map<string, Quad>,
    processedNodes: Set<string>
  ): void {
    const subjectValue = subject.value;

    // Evita cicli infiniti
    if (processedNodes.has(subjectValue)) {
      return;
    }
    processedNodes.add(subjectValue);

    const newSubject = DataFactory.namedNode(this.replaceBase(subjectValue, true));

    // Ottieni tutti i quads con questo soggetto
    const quads = sourceQuads.filter((q) => q.subject.equals(subject));

    quads.forEach((quad) => {
      const predicate = quad.predicate;
      const object = quad.object;

      // Non processare ulteriormente se il soggetto è una classe dello schema
      if (
        (subject.value.startsWith('http://www.w3.org/') ||
          subject.value.startsWith('http://purl.org/')) &&
        !this.semanticTypesToProcess.includes(subject.value)
      ) {
        return;
      }

      // Non processare ulteriormente se l'oggetto è una classe dello schema
      if (
        object.termType === 'NamedNode' &&
        (object.value.startsWith('http://www.w3.org/') ||
          object.value.startsWith('http://purl.org/')) &&
        !this.semanticTypesToProcess.includes(object.value)
      ) {
        return;
      }

      if (predicate.value === this.lexicalNamespaces.ontolex + 'lexicalizedSense') {
        // Rimuovi questa proprietà
        return;
      }

      if (predicate.value === this.lexicalNamespaces.skos + 'narrower') {
        // Gestione specifica per skos:narrower come già fatto in processNode
        const newObject = DataFactory.namedNode(this.replaceBase(object.value, true));

        // Aggiungi (new_object, skos:narrower, new_subject)
        const narrowerQuad = DataFactory.quad(
          newObject,
          DataFactory.namedNode(this.semanticNamespaces.skos + 'narrower'),
          newSubject
        );
        const narrowerQuadKey = this.quadToKey(narrowerQuad);
        if (!mainQuads.has(narrowerQuadKey)) {
          mainQuads.set(narrowerQuadKey, narrowerQuad);
        }

        // Aggiungi (new_subject, skos:broader, new_object)
        const broaderQuad = DataFactory.quad(
          newSubject,
          DataFactory.namedNode(this.semanticNamespaces.skos + 'broader'),
          newObject
        );
        const broaderQuadKey = this.quadToKey(broaderQuad);
        if (!mainQuads.has(broaderQuadKey)) {
          mainQuads.set(broaderQuadKey, broaderQuad);
        }
      } else {
        // Gestione regolare per le altre proprietà

        // Sostituisci l'URI nell'oggetto se necessario
        const newObject =
          object.termType === 'NamedNode'
            ? DataFactory.namedNode(this.replaceBase(object.value, true))
            : object;

        // Cambia il tipo da ontolex:LexicalConcept a skos:Concept
        if (
          predicate.value === this.semanticNamespaces.rdf + 'type' &&
          object.value === this.semanticNamespaces.ontolex + 'LexicalConcept'
        ) {
          const newTypeQuad = DataFactory.quad(
            newSubject,
            DataFactory.namedNode(this.semanticNamespaces.rdf + 'type'),
            DataFactory.namedNode(this.semanticNamespaces.skos + 'Concept')
          );
          const newTypeKey = this.quadToKey(newTypeQuad);
          if (!mainQuads.has(newTypeKey)) {
            mainQuads.set(newTypeKey, newTypeQuad);
          }
        } else {
          // Aggiungi il quad al grafo principale
          const newQuad = DataFactory.quad(newSubject, predicate, newObject);
          const quadKey = this.quadToKey(newQuad);

          if (!mainQuads.has(quadKey)) {
            mainQuads.set(quadKey, newQuad);
          }
        }
      }
    });
  }

  // Metodo principale per processare i dati Trig e ottenere il Turtle finale per il lessico
  async exportLexicalData(trigData: string): Promise<string> {
    // 1. Parsing dei dati Trig
    const parser = new Parser({ format: 'application/trig' });
    const quads: Quad[] = parser.parse(trigData);

    // 2. Creazione di un insieme per tracciare i nodi già processati
    const processedNodes = new Set<string>();

    // 3. Creazione di un Map per i quads finali
    const mainQuads = new Map<string, Quad>();

    // 4. Filtra i quads per trovare i soggetti dei tipi da processare
    const subjectsToProcess = new Set<string>();

    quads.forEach((quad) => {
      if (
        quad.predicate.value === this.lexicalNamespaces.rdf + 'type' &&
        this.lexicalTypesToProcess.includes(quad.object.value)
      ) {
        subjectsToProcess.add(quad.subject.value);
      }
    });

    // 5. Processa ogni soggetto iniziale
    subjectsToProcess.forEach((subjectValue) => {
      const subjectNode = DataFactory.namedNode(subjectValue);
      this.processNode(subjectNode, quads, mainQuads, processedNodes);
    });

    // 6. Converti i quads in un array e ordina per soggetto
    const sortedQuads = Array.from(mainQuads.values()).sort((a, b) =>
      a.subject.value.localeCompare(b.subject.value)
    );

    // 7. Serializza il grafo in formato Turtle con le triple raggruppate
    let turtleData = await this.serializeQuadsToTurtle(sortedQuads, this.lexicalNamespaces);

    // 8. Modifica manuale del prefisso "lexinfo" se necessario
    turtleData = turtleData.replace(/ns\d+:/g, 'lexinfo:');

    // 9. Suddividi il Turtle in prefissi e corpo
    const [prefixesPart, bodyPart] = this.splitPrefixesAndBody(turtleData);

    // 10. Sostituisci gli URI nel corpo
    const newBody = this.replaceURIsWithPrefixes(bodyPart, false);

    // 11. Aggiungi spazi a capo tra gli statements
    const newBodyWithNewlines = this.addNewlinesBetweenStatements(newBody);

    // 12. Ricostruisci il Turtle finale
    const finalTurtleData = prefixesPart + '\n\n' + newBodyWithNewlines;

    return finalTurtleData;
  }

  // Metodo principale per processare i dati Trig e ottenere il Turtle finale per i campi semantici
  async exportSemanticFields(trigData: string): Promise<string> {
    // 1. Parsing dei dati Trig
    const parser = new Parser({ format: 'application/trig' });
    const quads: Quad[] = parser.parse(trigData);

    // 2. Creazione di un insieme per tracciare i nodi già processati
    const processedNodes = new Set<string>();

    // 3. Creazione di un Map per i quads finali
    const mainQuads = new Map<string, Quad>();

    // 4. Filtra i quads per trovare i soggetti dei tipi da processare
    const subjectsToProcess = new Set<string>();

    quads.forEach((quad) => {
      if (
        quad.predicate.value === this.lexicalNamespaces.rdf + 'type' &&
        this.semanticTypesToProcess.includes(quad.object.value)
      ) {
        subjectsToProcess.add(quad.subject.value);
      }
    });

    // 5. Processa ogni soggetto iniziale
    subjectsToProcess.forEach((subjectValue) => {
      const subjectNode = DataFactory.namedNode(subjectValue);
      this.processSemanticNode(subjectNode, quads, mainQuads, processedNodes);
    });

    // 6. Aggiungi il Concept Scheme
    const conceptSchemeQuads = this.createConceptScheme();
    conceptSchemeQuads.forEach((quad) => {
      const key = this.quadToKey(quad);
      if (!mainQuads.has(key)) {
        mainQuads.set(key, quad);
      }
    });

    // 7. Collega tutti gli skos:Concept al Concept Scheme tramite skos:inScheme
    const conceptSchemeURI = 'https://vocabs.ilc4clarin.ilc.cnr.it/vocabularies/digitant_sem_fields/';
    mainQuads.forEach((quad) => {
      if (
        quad.predicate.value === this.semanticNamespaces.rdf + 'type' &&
        quad.object.value === this.semanticNamespaces.skos + 'Concept'
      ) {
        // Aggiungi skos:inScheme
        const inSchemeQuad = DataFactory.quad(
          quad.subject,
          DataFactory.namedNode(this.semanticNamespaces.skos + 'inScheme'),
          DataFactory.namedNode(conceptSchemeURI)
        );
        const key = this.quadToKey(inSchemeQuad);
        if (!mainQuads.has(key)) {
          mainQuads.set(key, inSchemeQuad);
        }
      }
    });

    // Modifica: Aggiungi skos:topConceptOf ai nodi che hanno solo skos:narrower e non skos:broader
mainQuads.forEach((quad) => {
  const subject = quad.subject.value;
  const hasBroader = Array.from(mainQuads.values()).some(
    (q) =>
      q.subject.value === subject &&
      q.predicate.value === this.semanticNamespaces.skos + 'broader'
  );

  const hasNarrower = Array.from(mainQuads.values()).some(
    (q) =>
      q.subject.value === subject &&
      q.predicate.value === this.semanticNamespaces.skos + 'narrower'
  );

  if (((!hasBroader && hasNarrower) || (!hasBroader && !hasNarrower)) && subject != conceptSchemeURI) {
    const topConceptQuad = DataFactory.quad(
      DataFactory.namedNode(subject),
      DataFactory.namedNode(this.semanticNamespaces.skos + 'topConceptOf'),
      DataFactory.namedNode(conceptSchemeURI)
    );
    const key = this.quadToKey(topConceptQuad);
    if (!mainQuads.has(key)) {
      mainQuads.set(key, topConceptQuad);
    }
  }
});


// Identifica tutti gli skos:Concept
const allConcepts = Array.from(mainQuads.values())
  .filter(
    (quad) =>
      quad.predicate.value === this.semanticNamespaces.rdf + 'type' &&
      quad.object.value === this.semanticNamespaces.skos + 'Concept'
  )
  .map((quad) => quad.subject.value);

// Aggiungi skos:topConceptOf ai concetti che non hanno né skos:narrower né skos:broader
allConcepts.forEach((concept) => {
  const hasNarrower = Array.from(mainQuads.values()).some(
    (q) =>
      q.subject.value === concept &&
      q.predicate.value === this.semanticNamespaces.skos + 'narrower'
  );
  const hasBroader = Array.from(mainQuads.values()).some(
    (q) =>
      q.subject.value === concept &&
      q.predicate.value === this.semanticNamespaces.skos + 'broader'
  );
  
  if (!hasNarrower && !hasBroader) {
    const topConceptQuad = DataFactory.quad(
      DataFactory.namedNode(conceptSchemeURI),
      DataFactory.namedNode(this.semanticNamespaces.skos + 'hasTopConcept'), // Proprietà richiesta
      DataFactory.namedNode(concept)
    );
    const key = this.quadToKey(topConceptQuad);
    if (!mainQuads.has(key)) {
      mainQuads.set(key, topConceptQuad);
    }
  }
});


    // 9. Linka al Concept Scheme tutti gli skos:Concept che hanno la proprietà skos:topConceptOf
    mainQuads.forEach((quad) => {
      if (quad.predicate.value === this.semanticNamespaces.skos + 'topConceptOf') {
        const concept = quad.subject.value;
        const inSchemeQuad = DataFactory.quad(
          DataFactory.namedNode(concept),
          DataFactory.namedNode(this.semanticNamespaces.skos + 'inScheme'),
          DataFactory.namedNode(conceptSchemeURI)
        );
        const key = this.quadToKey(inSchemeQuad);
        if (!mainQuads.has(key)) {
          mainQuads.set(key, inSchemeQuad);
        }

        // **Modifica: Aggiungi la tripla (ConceptScheme, skos:hasTopConcept, Concept)**
        const hasTopConceptQuad = DataFactory.quad(
          DataFactory.namedNode(conceptSchemeURI),
          DataFactory.namedNode(this.semanticNamespaces.skos + 'hasTopConcept'), // Proprietà richiesta
          DataFactory.namedNode(concept)
        );
        const hasTopConceptKey = this.quadToKey(hasTopConceptQuad);
        if (!mainQuads.has(hasTopConceptKey)) {
          mainQuads.set(hasTopConceptKey, hasTopConceptQuad);
        }
      }
    });

    // **Nuovo Passo: Aggiungi tutte le triple (ConceptScheme, skos:hasTopConcept, Concept)**
    // Alternativamente, se preferisci raccogliere tutte le Concepts prima, puoi usare un array.

    // 10. Converti i quads in un array e ordina per soggetto
    const sortedQuads = Array.from(mainQuads.values()).sort((a, b) =>
      a.subject.value.localeCompare(b.subject.value)
    );

    // 11. Serializza il grafo in formato Turtle con le triple raggruppate
    let turtleData = await this.serializeQuadsToTurtle(sortedQuads, this.semanticNamespaces);

    // 12. Suddividi il Turtle in prefissi e corpo
    const [prefixesPart, bodyPart] = this.splitPrefixesAndBody(turtleData);

    // 13. Sostituisci gli URI nel corpo
    const newBody = this.replaceURIsWithPrefixes(bodyPart, true);

    // 14. Aggiungi spazi a capo tra gli statements
    const newBodyWithNewlines = this.addNewlinesBetweenStatements(newBody);

    // 15. Ricostruisci il Turtle finale
    const finalTurtleData = prefixesPart + '\n\n' + newBodyWithNewlines;

    return finalTurtleData;
  }

  // Funzione per creare il Concept Scheme secondo ${CONCEPT_SCHEME}
  private createConceptScheme(): Quad[] {
    const conceptSchemeURI = 'https://vocabs.ilc4clarin.ilc.cnr.it/vocabularies/digitant_sem_fields/';

    const quads: Quad[] = [
      // Definisce il ConceptScheme come OWL Ontology e SKOS ConceptScheme
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.rdf + 'type'),
        DataFactory.namedNode(this.semanticNamespaces.owl + 'Ontology')
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.rdf + 'type'),
        DataFactory.namedNode(this.semanticNamespaces.skos + 'ConceptScheme')
      ),

      // Proprietà di importazione
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.owl + 'imports'),
        DataFactory.namedNode(this.semanticNamespaces.skos)
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.owl + 'imports'),
        DataFactory.namedNode(this.semanticNamespaces.ontolex)
      ),

      // Commento
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.rdfs + 'comment'),
        DataFactory.literal(
          'List of concepts of semantic fields used to classify Indo-European words in Buck, Carl Darling. 1949. A dictionary of selected synonyms in the principal Indo-European languages. University of Chicago Press, Chicago. The semantic fields are also defined as ontolex:LexicalConcept',
          'en'
        )
      ),

      // Etichette e altre proprietà
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.rdfs + 'label'),
        DataFactory.literal('ItAnt Semantic Fields according to Buck (1949)', 'en')
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.dct + 'issued'),
        DataFactory.literal('2024-10-14', DataFactory.namedNode(this.semanticNamespaces.xsd + 'dateTime'))
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.dct + 'title'),
        DataFactory.literal("ItAnt Concept Scheme of Buck's Semantic Fields for Indo-European languages", 'en')
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.dct + 'identifier'),
        DataFactory.literal('CLARIN resource identifier: http://hdl.handle.net/20.500.11752/OPEN-1030')
      ),
      DataFactory.quad(
        DataFactory.namedNode(conceptSchemeURI),
        DataFactory.namedNode(this.semanticNamespaces.dct + 'language'),
        DataFactory.namedNode('http://iso639-3.sil.org/code/eng')
      ),
    ];

    return quads;
  }

  // Metodo per serializzare i quads in formato Turtle
  private serializeQuadsToTurtle(quads: Quad[], namespaces: { [key: string]: string }): Promise<string> {
    return new Promise((resolve, reject) => {
      const writer = new Writer({
        prefixes: namespaces,
        format: 'Turtle',
        grouped: true, // Abilita il raggruppamento delle triple per soggetto
      });

      writer.addQuads(quads);

      writer.end((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  // Funzione per sostituire gli URI completi con i prefissi
  private replaceURIsWithPrefixes(turtleBody: string, isSemantic: boolean = false): string {
    const namespaces = isSemantic ? this.semanticNamespaces : this.lexicalNamespaces;

    for (const [prefix, uri] of Object.entries(namespaces)) {
      const escapedURI = this.escapeRegex(uri);
      const regex = new RegExp(`<${escapedURI}([^>]*)>`, 'g');
      turtleBody = turtleBody.replace(regex, `${prefix}:$1`);
    }
    return turtleBody;
  }

  // Funzione per aggiungere uno spazio a capo tra gli statements
  private addNewlinesBetweenStatements(turtleData: string): string {
    const lines = turtleData.split('\n');
    const newLines: string[] = []; // Corretto: Specifica il tipo string[]
    let inPrefixes = true;

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }

      if (line.startsWith('@prefix')) {
        newLines.push(line);
      } else {
        inPrefixes = false;
        newLines.push(line);
        if (line.trim().endsWith('.')) {
          newLines.push(''); // Corretto: ora è di tipo string
        }
      }
    }

    return newLines.join('\n');
  }

  // Funzione per dividere i prefissi dal corpo
  private splitPrefixesAndBody(turtleData: string): [string, string] {
    const lines = turtleData.split('\n');
    let prefixesEndIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('@prefix') && line.trim() !== '') {
        prefixesEndIndex = i;
        break;
      }
    }

    const prefixesPart = lines.slice(0, prefixesEndIndex).join('\n');
    const bodyPart = lines.slice(prefixesEndIndex).join('\n');

    return [prefixesPart, bodyPart];
  }

  // Funzione per eseguire l'escape di una stringa per l'uso in una regex
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
