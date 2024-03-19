/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class LexicalEntriesService {
  /**
   * Questa classe gestisce la comunicazione e le operazioni con il backend del lexicon.
   */
  private arrayPanelFormsData = {};

  // BehaviorSubject per variabili che possono cambiare nel tempo e per le quali si vuole mantenere uno stato attuale.
  // Ogni BehaviorSubject è associato a un tipo di dato specifico.
  private _coreFormData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _attestationPanelData: BehaviorSubject<object> = new BehaviorSubject(
    null
  );
  private _etymologyData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _rightPanelData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _deleteLexicalEntryReq: BehaviorSubject<any> = new BehaviorSubject(
    null
  );
  private _addSubElementReq: BehaviorSubject<any> = new BehaviorSubject(null);
  private _updateCoreCardReq: BehaviorSubject<object> = new BehaviorSubject(
    null
  );
  private _spinnerAction: BehaviorSubject<string> = new BehaviorSubject(null);
  private _refreshLanguageTable: BehaviorSubject<object> = new BehaviorSubject(
    null
  );
  private _refreshAfterEdit: BehaviorSubject<object> = new BehaviorSubject(
    null
  );
  private _refreshFilter: BehaviorSubject<object> = new BehaviorSubject(null);
  private _updateLangSelect: BehaviorSubject<object> = new BehaviorSubject(
    null
  );
  private _triggerNotePanel: BehaviorSubject<boolean> = new BehaviorSubject(
    null
  );
  private _triggerAttestationPanel: BehaviorSubject<boolean> =
    new BehaviorSubject(null);
  private _changeDecompLabel: BehaviorSubject<string> = new BehaviorSubject(
    null
  );
  private _decompData: BehaviorSubject<object> = new BehaviorSubject(null);
  private _refreshLinkCounter: BehaviorSubject<string> = new BehaviorSubject(
    null
  );
  private _triggerLexicalEntryTree: BehaviorSubject<object> =
    new BehaviorSubject(null);
  private _triggerSameAs: BehaviorSubject<object> = new BehaviorSubject(null);

  private _changeFormLabel: BehaviorSubject<object> = new BehaviorSubject(null);

  // Dati di morfologia
  morphologyData;

  // URL base del servizio del backend
  private baseUrl = '/LexO-backend-itant_itant/service/';

  // Chiave per l'autenticazione
  private key = 'PRINitant19';

  // Autore
  private author = '';

  // IRI per la bibliografia
  private bibliographyIRI = 'http://lexica/mylexicon/bibliography#';

  // IRI per il lessico
  private lexicalIRI = 'http://lexica/mylexicon#';

  // Prefisso lessicale
  private lexicalPrefix = 'lex';

  // Osservabili per i dati
  coreData$ = this._coreFormData.asObservable();
  decompData$ = this._decompData.asObservable();
  attestationPanelData$ = this._attestationPanelData.asObservable();
  etymologyData$ = this._etymologyData.asObservable();
  rightPanelData$ = this._rightPanelData.asObservable();
  deleteReq$ = this._deleteLexicalEntryReq.asObservable();
  addSubReq$ = this._addSubElementReq.asObservable();
  updateCoreCardReq$ = this._updateCoreCardReq.asObservable();
  spinnerAction$ = this._spinnerAction.asObservable();
  refreshLangTable$ = this._refreshLanguageTable.asObservable();
  refreshAfterEdit$ = this._refreshAfterEdit.asObservable();
  refreshFilter$ = this._refreshFilter.asObservable();
  updateLangSelect$ = this._updateLangSelect.asObservable();
  triggerNotePanel$ = this._triggerNotePanel.asObservable();
  triggerAttestationPanel$ = this._triggerAttestationPanel.asObservable();
  changeDecompLabel$ = this._changeDecompLabel.asObservable();
  refreshLinkCounter$ = this._refreshLinkCounter.asObservable();
  triggerLexicalEntryTree$ = this._triggerLexicalEntryTree.asObservable();
  triggerSameAs$ = this._triggerSameAs.asObservable();

  changeFormLabelReq$ = this._changeFormLabel.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  // Metodo per aggiornare il contatore di link
  refreshLinkCounter(value: string) {
    this._refreshLinkCounter.next(value);
  }

  // Metodo per inviare dati alla scheda core
  sendToCoreTab(object: object) {
    this._coreFormData.next(object);
  }

  // Metodo per inviare dati alla scheda decomposizione
  sendToDecompTab(object: object) {
    this._decompData.next(object);
  }

  // Metodo per inviare dati al pannello di attestazione
  sendToAttestationPanel(object: object) {
    this._attestationPanelData.next(object);
  }

  // Metodo per cambiare l'etichetta del form
  changeFormLabel(formId: string, newLabel: string) {
    this._changeFormLabel.next({ formId, newLabel });
  }

  // Metodo per cambiare l'etichetta della decomposizione
  changeDecompLabel(string: string) {
    this._changeDecompLabel.next(string);
  }

  // Metodo per inviare dati alla scheda destra
  sendToRightTab(object: object) {
    this._rightPanelData.next(object);
  }

  // Metodo per inviare dati alla scheda etimologia
  sendToEtymologyTab(object: object) {
    this._etymologyData.next(object);
  }

  // Metodo per richiedere l'eliminazione
  deleteRequest(request?: any) {
    this._deleteLexicalEntryReq.next(request);
  }

  // Metodo per richiedere l'aggiunta di un sottoelemento
  addSubElementRequest(request?: any) {
    this._addSubElementReq.next(request);
  }

  // Metodo per aggiornare la scheda core
  updateCoreCard(object: object) {
    this._updateCoreCardReq.next(object);
  }

  // Metodo per l'azione spinner
  spinnerAction(string: string) {
    this._spinnerAction.next(string);
  }

  // Metodo per aggiornare la tabella delle lingue
  refreshLangTable() {
    this._refreshLanguageTable.next(null);
  }

  // Metodo per aggiornare dopo la modifica
  refreshAfterEdit(object: object) {
    this._refreshAfterEdit.next(object);
  }

  // Metodo per aggiornare il filtro
  refreshFilter(object: object) {
    this._refreshFilter.next(object);
  }

  // Metodo per aggiornare la selezione della lingua
  updateLangSelect(object: object) {
    this._updateLangSelect.next(object);
  }

  // Metodo per attivare il pannello delle note
  triggerNotePanel(bool: boolean) {
    this._triggerNotePanel.next(bool);
  }

  // Metodo per attivare il pannello di attestazione
  triggerAttestationPanel(bool: boolean) {
    this._triggerAttestationPanel.next(bool);
  }

  // Metodo per attivare l'albero delle voci lessicali
  triggerLexicalEntryTree(object: object) {
    this._triggerLexicalEntryTree.next(object);
  }

  // Metodo per attivare SameAs
  triggerSameAs(object: object) {
    this._triggerSameAs.next(object);
  }

  /**
   * Metodo per ottenere la lista di voci lessicali.
   * @param parameters Parametri della richiesta.
   * @returns Observable per la lista di voci lessicali.
   */
  getLexicalEntriesList(parameters: any): Observable<any> {
    return this.http.post(
      this.baseUrl + 'lexicon/data/lexicalEntries',
      parameters
    );
  }

  // Questo metodo invia una richiesta POST per ottenere l'elenco delle voci lessicali
  getLexicalSensesList(parameters: any): Observable<any> {
    return this.http.post(
      this.baseUrl + 'lexicon/data/filteredSenses',
      parameters
    );
  }

  // Questo metodo invia una richiesta POST per ottenere l'elenco delle forme
  getFormList(parameters: any): Observable<any> {
    return this.http.post(
      this.baseUrl + 'lexicon/data/filteredForms',
      parameters
    );
  }

  // Questo metodo invia una richiesta GET per ottenere gli elementi della voce lessicale
  getLexEntryElements(instance: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/elements?key=lexodemo&id=' +
        encodeURIComponent(instance)
    );
  }

  // Questo metodo invia una richiesta GET per ottenere dati specifici (morfologia, sintassi, ...) associati a una data voce lessicale
  getLexEntryData(instance: string): Observable<any> {
    return this.http
      .get(
        `${this.baseUrl}lexicon/data/lexicalEntry?key=${
          this.key
        }&module=core&id=${encodeURIComponent(instance)}`
      )
      .pipe(shareReplay());
  }

  // Questo metodo invia una richiesta GET per ottenere le relazioni linguistiche con altre entità lessicali in base al tipo di input
  getLexEntryLinguisticRelation(
    lexId: string,
    property: string
  ): Observable<any> {
    return this.http.get(
      `${this.baseUrl}lexicon/data/linguisticRelation?key=${
        this.key
      }&id=${encodeURIComponent(lexId)}&property=${property}`
    );
  }

  // Questo metodo invia una richiesta GET per ottenere le relazioni generiche con altre entità lessicali in base al tipo di input
  getLexEntryGenericRelation(lexId: string, property: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}lexicon/data/genericRelation?key=${
        this.key
      }&id=${encodeURIComponent(lexId)}&property=${property}`
    );
  }

  // Questo metodo invia una richiesta GET per ottenere le forme della voce lessicale
  getLexEntryForms(instance: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/forms?key=lexodemo&id=' +
        encodeURIComponent(instance)
    );
  }

  // Questo metodo invia una richiesta GET per ottenere i dati su una singola forma
  getFormData(formId: string, aspect: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/form?key=' +
        this.key +
        '&module=' +
        aspect +
        '&id=' +
        encodeURIComponent(formId)
    );
  }

  // Questo metodo invia una richiesta GET per ottenere le rappresentazioni Ontolex
  getOntolexRepresentations(): Observable<any> {
    return this.http.get(this.baseUrl + 'ontolex/data/representation');
  }

  // Questo metodo invia una richiesta GET per ottenere le rappresentazioni Lexinfo
  getLexinfoRepresentations(): Observable<any> {
    return this.http.get(this.baseUrl + 'lexinfo/data/representation');
  }

  // Questo metodo invia una richiesta GET per ottenere i dati su un singolo senso
  getSenseData(senseId: string, aspect: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/lexicalSense?key=' +
        this.key +
        '&module=' +
        aspect +
        '&id=' +
        encodeURIComponent(senseId)
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco dei sensi di una voce lessicale
  getSensesList(instance: any): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/senses?key=lexodemo&id=' +
        encodeURIComponent(instance)
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco delle lingue del lessico
  getLexiconLanguages(): Observable<any> {
    return this.http.get(this.baseUrl + 'lexicon/data/languages');
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco delle lingue per il filtro del menu delle voci lessicali
  getLanguages(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/languages?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco dei tipi
  getTypes(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/types?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco degli autori
  getAuthors(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/authors?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco delle parti del discorso
  getPos(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/pos?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco degli stati
  getStatus(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/status?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per ottenere l'elenco dei namespace
  getNamespaces(): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/statistics/namespaces?key=' + this.key + ''
    );
  }

  // Questo metodo invia una richiesta GET per creare una nuova voce lessicale
  newLexicalEntry(): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/lexicalEntry?key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Questo metodo invia una richiesta GET per eliminare una voce lessicale
  deleteLexicalEntry(lexId): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/lexicalEntry?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(lexId)
    );
  }

  // Questo metodo invia una richiesta GET per eliminare una forma lessicale
  deleteForm(lexId): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/form?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(lexId)
    );
  }

  // Funzione per eliminare un'entrata lessicale
  deleteSense(lexId): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/lexicalSense?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(lexId)
    );
  }

  // Funzione per eliminare una lingua dal lessico
  deleteLanguage(langId): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/language?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(langId)
    );
  }

  // Funzione per eliminare una relazione linguistica
  deleteLinguisticRelation(lexId, parameters): Observable<any> {
    return this.http.post(
      this.baseUrl +
        'lexicon/delete/relation?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(lexId),
      parameters
    );
  }

  // Funzione per aggiornare un'entrata lessicale
  updateLexicalEntry(lexId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/lexicalEntry?key=' +
        this.key +
        '&author=' +
        this.author +
        '&id=' +
        encodeURIComponent(lexId),
      parameters
    );
  }

  // Funzione per aggiornare una relazione linguistica per il Core
  updateLinguisticRelation(lexId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/linguisticRelation?key=' +
        this.key +
        '&user=' +
        this.author +
        '&id=' +
        encodeURIComponent(lexId),
      parameters
    );
  }

  // Funzione per aggiornare una relazione generica
  updateGenericRelation(lexId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/genericRelation?key=' +
        this.key +
        '&user=' +
        this.author +
        '&id=' +
        encodeURIComponent(lexId),
      parameters
    );
  }

  // Funzione per aggiornare i valori del modulo
  updateForm(formId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/form?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(formId),
      parameters
    );
  }

  // Funzione per aggiornare i valori del senso lessicale
  updateSense(senseId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/lexicalSense?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(senseId),
      parameters
    );
  }

  // Funzione per ottenere i dati sulla morfologia
  getMorphologyData(): Observable<object[]> {
    return this.http.get<object[]>(this.baseUrl + 'lexinfo/data/morphology');
  }

  // Funzione per ottenere i tipi di modulo
  getFormTypes(): Observable<any> {
    return this.http.get(this.baseUrl + 'ontolex/data/formType');
  }

  // Funzione per ottenere i tipi di entrata lessicale
  getLexEntryTypes(): Observable<object[]> {
    return this.http.get<object[]>(
      this.baseUrl + 'ontolex/data/lexicalEntryType'
    );
  }

  // Funzione per creare un nuovo modulo
  createNewForm(lexId): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/form?lexicalEntryID=' +
        encodeURIComponent(lexId) +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Funzione per creare un nuovo senso
  createNewSense(lexId): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/lexicalSense?lexicalEntryID=' +
        encodeURIComponent(lexId) +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Funzione per creare una nuova lingua
  createNewLanguage(langId): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/language?key=' +
        this.key +
        '&lang=' +
        langId +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Funzione per aggiornare una lingua
  updateLanguage(langId, parameters): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/language?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(langId),
      parameters
    );
  }

  // Funzione per ottenere i dati bibliografici
  getBibliographyData(instance: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/bibliography?key=lexodemo&id=' +
        encodeURIComponent(instance)
    );
  }

  // Funzione per aggiungere dati bibliografici
  addBibliographyData(instance: string, parameters) {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/creation/bibliography?id=' +
        encodeURIComponent(instance) +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=lexbib&baseIRI=' +
        encodeURIComponent(this.bibliographyIRI),
      parameters
    );
  }

  // Funzione per rimuovere un elemento bibliografico
  removeBibliographyItem(instance: string) {
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/bibliography?key=PRINitant19&id=' +
        encodeURIComponent(instance)
    );
  }

  // Funzione per sincronizzare un elemento bibliografico
  synchronizeBibliographyItem(lexId: string, itemKey: string): Observable<any> {
    this.author = this.auth.getUsername();
    return this.http.post(
      this.baseUrl +
        'lexicon/update/synchronizeBibliography?id=' +
        encodeURIComponent(lexId) +
        '&key=PRINitant19&author=' +
        this.author +
        '&itemKey=' +
        itemKey,
      {}
    );
  }

  // Questa classe gestisce le chiamate API relative all'etimologia e alla decomposizione delle entità lessicali.

  // Funzione per creare una nuova etimologia.
  // Parametro: instance - identificativo dell'entità lessicale
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  createNewEtymology(instance: string): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta GET all'endpoint appropriato per creare una nuova etimologia.
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/etymology?lexicalEntryID=' +
        encodeURIComponent(instance) +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Funzione per ottenere tutte le etimologie di un'entità lessicale.
  // Parametro: instance - identificativo dell'entità lessicale
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  getEtymologies(instance: string): Observable<any> {
    // Effettuiamo una richiesta GET per ottenere le etimologie dell'entità lessicale specificata.
    return this.http.get(
      this.baseUrl +
        'lexicon/data/etymologies?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(instance)
    );
  }

  // Funzione per ottenere i dati relativi a un'etimologia specifica.
  // Parametro: instance - identificativo dell'etimologia
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  getEtymologyData(instance: string): Observable<any> {
    // Effettuiamo una richiesta GET per ottenere i dati dell'etimologia specificata.
    return this.http.get(
      this.baseUrl +
        'lexicon/data/etymology?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(instance)
    );
  }

  // Funzione per aggiornare un'etimologia esistente.
  // Parametri: etymId - identificativo dell'etimologia, parameters - parametri da aggiornare
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  updateEtymology(etymId, parameters): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta POST all'endpoint appropriato per aggiornare l'etimologia.
    return this.http.post(
      this.baseUrl +
        'lexicon/update/etymology?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(etymId),
      parameters
    );
  }

  // Funzione per creare un nuovo collegamento etimologico tra due entità lessicali.
  // Parametri: lexInstance - identificativo dell'entità lessicale, etymInstance - identificativo dell'etimologia
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  createNewEtylink(lexInstance: string, etymInstance: string): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta GET all'endpoint appropriato per creare un nuovo collegamento etimologico.
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/etymologicalLink?lexicalEntryID=' +
        encodeURIComponent(lexInstance) +
        '&etymologyID=' +
        encodeURIComponent(etymInstance) +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        '&prefix=' +
        this.lexicalPrefix +
        '&baseIRI=' +
        encodeURIComponent(this.lexicalIRI)
    );
  }

  // Funzione per eliminare un'etimologia.
  // Parametro: etymInstance - identificativo dell'etimologia da eliminare
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  deleteEtymology(etymInstance: string): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta GET per eliminare l'etimologia specificata.
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/etymology?key=' +
        this.key +
        '&author=' +
        this.author +
        '&id=' +
        encodeURIComponent(etymInstance)
    );
  }

  // Funzione per aggiornare un collegamento etimologico esistente.
  // Parametri: etymId - identificativo del collegamento etimologico, parameters - parametri da aggiornare
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  updateEtylink(etymId, parameters): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta POST all'endpoint appropriato per aggiornare il collegamento etimologico.
    return this.http.post(
      this.baseUrl +
        'lexicon/update/etymologicalLink?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(etymId),
      parameters
    );
  }

  // Funzione per eliminare un collegamento etimologico.
  // Parametro: etyLinkInstance - identificativo del collegamento etimologico da eliminare
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  deleteEtylink(etyLinkInstance: string): Observable<any> {
    // Otteniamo l'autore dell'azione dalla sessione corrente.
    this.author = this.auth.getUsername();
    // Effettuiamo una richiesta GET per eliminare il collegamento etimologico specificato.
    return this.http.get(
      this.baseUrl +
        'lexicon/delete/etymologicalLink?key=' +
        this.key +
        '&author=' +
        this.author +
        '&id=' +
        encodeURIComponent(etyLinkInstance)
    );
  }

  // Funzione per ottenere i sotto-componenti di un'entità lessicale.
  // Parametro: lexicalEntityID - identificativo dell'entità lessicale
  // Restituisce un Observable che rappresenta la richiesta HTTP.
  getSubTerms(lexicalEntityID: string): Observable<any> {
    // Effettuiamo una richiesta GET per ottenere i sotto-componenti dell'entità lessicale specificata.
    return this.http.get(
      this.baseUrl +
        'lexicon/data/subTerms?key=' +
        this.key +
        '&id=' +
        encodeURIComponent(lexicalEntityID)
    );
  }

  // Questo metodo ottiene i costituenti per un'entità lessicale identificata da un ID.
  // Restituisce un Observable contenente la richiesta HTTP per ottenere i costituenti.
  getConstituents(lexicalEntityID: string): Observable<any> {
    return this.http.get(
      this.baseUrl +
        'lexicon/data/' +
        lexicalEntityID +
        '/constituents?key=' +
        this.key
    );
  }

  // Questo metodo crea un componente per un'entità lessicale identificata da un ID.
  // Restituisce un Observable contenente la richiesta HTTP per creare il componente.
  createComponent(lexicalEntityID: string): Observable<any> {
    // Ottiene il nome dell'autore attualmente autenticato.
    this.author = this.auth.getUsername();
    return this.http.get(
      this.baseUrl +
        'lexicon/creation/component?id=' +
        lexicalEntityID +
        '&key=' +
        this.key +
        '&author=' +
        this.author +
        ''
    );
  }

  // Questo metodo elimina un componente identificato da un ID.
  // Restituisce un Observable contenente la richiesta HTTP per eliminare il componente.
  deleteComponent(compId: string): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/delete/' + compId + '/component?key=' + this.key
    );
  }

  // Questo metodo ottiene il corrispondente per un componente identificato da un ID.
  // Restituisce un Observable contenente la richiesta HTTP per ottenere il corrispondente.
  getCorrespondsTo(compId: string): Observable<any> {
    return this.http.get(
      this.baseUrl + 'lexicon/data/' + compId + '/correspondsTo?key=' + this.key
    );
  }

  // Questo metodo esporta il lessico.
  // Restituisce un Observable contenente la richiesta HTTP per esportare il lessico.
  exportLexicon(body: object): Observable<any> {
    return this.http.post(this.baseUrl + 'export/lexicon', body, {
      responseType: 'text',
    });
  }

  // Questo metodo restituisce i dati del pannello cognato per un'istanza di cognato e un'istanza lessicale specificate.
  getPanelCognate(cogInstanceName, lexInstanceName): object {
    return this.arrayPanelFormsData[cogInstanceName + '-' + lexInstanceName];
  }

  // Questo metodo crea un nuovo modulo pannello per un'istanza di cognato e un'istanza lessicale specificate.
  newPanelForm(cogInstanceName, lexInstanceName): void {
    this.arrayPanelFormsData[cogInstanceName + '-' + lexInstanceName] = {};
    this.arrayPanelFormsData[cogInstanceName + '-' + lexInstanceName].data =
      undefined;
    this.arrayPanelFormsData[cogInstanceName + '-' + lexInstanceName].isOpen =
      undefined;
  }

  // Questo metodo chiude il modulo pannello per un'istanza di cognato e un'istanza lessicale specificate.
  closePanelForm(cogInstanceName, lexInstanceName): void {
    this.arrayPanelFormsData[cogInstanceName + '-' + lexInstanceName] =
      undefined;
  }

  // Questo metodo restituisce tutti i moduli pannello.
  getAllPanelForms(): object {
    return this.arrayPanelFormsData;
  }
}
