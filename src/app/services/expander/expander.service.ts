/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExpanderService {
  isEpigraphyExpanded = false;
  isEditExpanded = false;

  isEditOpen = false;
  isEpigraphyOpen = false;

  private _openEdit: BehaviorSubject<boolean> = new BehaviorSubject(null);
  private _openEpigraphy: BehaviorSubject<boolean> = new BehaviorSubject(null);
  private _expandEpigraphy: BehaviorSubject<boolean> = new BehaviorSubject(
    null
  );
  private _expandEdit: BehaviorSubject<boolean> = new BehaviorSubject(null);
  expEpigraphy$ = this._expandEpigraphy.asObservable();
  expEdit$ = this._expandEdit.asObservable();
  openEdit$ = this._openEdit.asObservable();
  openEpigraphy$ = this._openEpigraphy.asObservable();

  constructor() {}

  // Questa funzione gestisce l'espansione o la contrazione della sezione epigrafica.
  // Accetta un argomento opzionale "trigger" che, se fornito, imposta lo stato di espansione o contrazione come specificato.
  // Se "trigger" non è definito, inverte lo stato corrente di espansione o contrazione.
  expandCollapseEpigraphy(trigger?) {
    if (trigger != undefined) {
      // Imposta lo stato di espansione o contrazione della sezione epigrafica con il valore fornito dal "trigger".
      this.isEpigraphyExpanded = trigger;
      // Emette un evento per notificare che lo stato di espansione o contrazione della sezione epigrafica è cambiato.
      this._expandEpigraphy.next(this.isEpigraphyExpanded);
    } else {
      // Inverte lo stato corrente di espansione o contrazione della sezione epigrafica.
      this.isEpigraphyExpanded = !this.isEpigraphyExpanded;
      // Emette un evento per notificare che lo stato di espansione o contrazione della sezione epigrafica è cambiato.
      this._expandEpigraphy.next(this.isEpigraphyExpanded);
    }
  }

  // Questa funzione gestisce l'espansione o la contrazione della sezione di modifica.
  // Accetta un argomento opzionale "trigger" che, se fornito, imposta lo stato di espansione o contrazione come specificato.
  // Se "trigger" non è definito, inverte lo stato corrente di espansione o contrazione.
  expandCollapseEdit(trigger?) {
    if (trigger != undefined) {
      // Imposta lo stato di espansione o contrazione della sezione di modifica con il valore fornito dal "trigger".
      this.isEditExpanded = trigger;
      // Emette un evento per notificare che lo stato di espansione o contrazione della sezione di modifica è cambiato.
      this._expandEdit.next(this.isEditExpanded);
    } else {
      // Inverte lo stato corrente di espansione o contrazione della sezione di modifica.
      this.isEditExpanded = !this.isEditExpanded;
      // Emette un evento per notificare che lo stato di espansione o contrazione della sezione di modifica è cambiato.
      this._expandEdit.next(this.isEditExpanded);
    }
  }

  // Questa funzione gestisce l'apertura o la chiusura della sezione di modifica.
  // Accetta un argomento opzionale "trigger" che, se fornito, imposta lo stato di apertura o chiusura come specificato.
  // Se "trigger" non è definito, inverte lo stato corrente di apertura o chiusura.
  openCollapseEdit(trigger?) {
    if (trigger != undefined) {
      // Imposta lo stato di apertura o chiusura della sezione di modifica con il valore fornito dal "trigger".
      this.isEditOpen = trigger;
      // Emette un evento per notificare che lo stato di apertura o chiusura della sezione di modifica è cambiato.
      this._openEdit.next(trigger);
    } else {
      // Inverte lo stato corrente di apertura o chiusura della sezione di modifica.
      this.isEditOpen = !this.isEditOpen;
      // Emette un evento per notificare che lo stato di apertura o chiusura della sezione di modifica è cambiato.
      this._openEdit.next(this.isEditOpen);
    }
  }

  // Questa funzione gestisce l'apertura o la chiusura della sezione epigrafica.
  // Accetta un argomento opzionale "trigger" che, se fornito, imposta lo stato di apertura o chiusura come specificato.
  // Se "trigger" non è definito, inverte lo stato corrente di apertura o chiusura.
  openCollapseEpigraphy(trigger?) {
    if (trigger != undefined) {
      // Imposta lo stato di apertura o chiusura della sezione epigrafica con il valore fornito dal "trigger".
      this.isEpigraphyOpen = trigger;
      // Emette un evento per notificare che lo stato di apertura o chiusura della sezione epigrafica è cambiato.
      this._openEpigraphy.next(trigger);
    } else {
      // Inverte lo stato corrente di apertura o chiusura della sezione epigrafica.
      this.isEpigraphyOpen = !this.isEpigraphyOpen;
      // Emette un evento per notificare che lo stato di apertura o chiusura della sezione epigrafica è cambiato.
      this._openEpigraphy.next(this.isEpigraphyOpen);
    }
  }

  // Restituisce lo stato corrente di espansione della scheda di modifica.
  isEditTabExpanded() {
    return this.isEditExpanded;
  }

  // Restituisce lo stato corrente di espansione della scheda epigrafica.
  isEpigraphyTabExpanded() {
    return this.isEpigraphyExpanded;
  }

  // Restituisce lo stato corrente di apertura della scheda di modifica.
  isEditTabOpen() {
    return this.isEditOpen;
  }

  // Restituisce lo stato corrente di apertura della scheda epigrafica.
  isEpigraphyTabOpen() {
    return this.isEpigraphyOpen;
  }
}
