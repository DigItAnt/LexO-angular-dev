/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-link-panel',
  templateUrl: './link-panel.component.html',
  styleUrls: ['./link-panel.component.scss'],
})
export class LinkPanelComponent implements OnInit, OnDestroy {
  @Input() linkData: any[] | any;

  seeAlsoData: {};
  sameAsData: {};
  counterElement = 0;
  object: any;

  refresh_subscription: Subscription;

  constructor(
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Sottoscrivi all'observable per aggiornare il contatore dei collegamenti
    this.refresh_subscription =
      this.lexicalService.refreshLinkCounter$.subscribe(
        (data) => {
          console.log(data);
          if (data != null) {
            // Aggiorna il contatore con il valore ricevuto
            this.counterElement = eval(this.counterElement.toString() + data);
          }
        },
        (error) => {
          console.log(error);
        }
      );
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes.linkData.currentValue != null) {
      // Inizializza il contatore a 0 e ottieni i dati del link
      this.counterElement = 0;
      this.object = changes.linkData.currentValue;
      this.sameAsData = null;
      this.seeAlsoData = null;
      let lexicalElementId = '';
      let instanceNameType = '';
      let parameters = {};
      // Determina il tipo di elemento lessicale
      if (
        this.object.lexicalEntry != undefined &&
        this.object.form == undefined &&
        this.object.sense == undefined
      ) {
        lexicalElementId = this.object.lexicalEntry;
        instanceNameType = 'lexicalEntry';
      } else if (this.object.form != undefined) {
        lexicalElementId = this.object.form;
        instanceNameType = 'form';
      } else if (this.object.sense != undefined) {
        lexicalElementId = this.object.sense;
        instanceNameType = 'sense';
      } else if (this.object.etymology != undefined) {
        lexicalElementId = this.object.etymology;
        instanceNameType = 'etymology';
      } else if (this.object.lexicalConcept != undefined) {
        lexicalElementId = this.object.lexicalConcept;
        instanceNameType = 'lexicalConcept';
      }

      try {
        // Ottieni i dati dei link 'sameAs' per l'elemento lessicale
        let same_as_data = await this.lexicalService
          .getLexEntryGenericRelation(lexicalElementId, 'sameAs')
          .toPromise();
        console.log(same_as_data);
        this.sameAsData = {};
        this.sameAsData['array'] = same_as_data;
        // Imposta i dati 'sameAs' con le informazioni pertinenti
        if (instanceNameType == 'lexicalEntry') {
          this.sameAsData['parentNodeLabel'] = this.object['lexicalEntry'];
        }
        this.sameAsData[instanceNameType] = this.object[instanceNameType];
        this.sameAsData['type'] = this.object.type;
      } catch (e) {
        if (e.status == 200) {
          // Nessun dato 'sameAs' trovato, gestisci di conseguenza
          this.sameAsData = {};
          this.sameAsData['array'] = [];
          if (instanceNameType == 'lexicalEntry') {
            this.sameAsData['parentNodeLabel'] = this.object['lexicalEntry'];
          }
          this.sameAsData[instanceNameType] = this.object[instanceNameType];
          this.sameAsData['label'] = this.object['label'];
          this.sameAsData['type'] = this.object.type;
          console.log(e);
        } else {
          // Gestisci eventuali errori
        }
      }

      try {
        // Ottieni i dati dei link 'seeAlso' per l'elemento lessicale
        let see_also_data = await this.lexicalService
          .getLexEntryGenericRelation(lexicalElementId, 'seeAlso')
          .toPromise();
        console.log(see_also_data);
        this.seeAlsoData = {};
        this.seeAlsoData['array'] = see_also_data;
        this.seeAlsoData['parentNodeLabel'] = this.object['lexicalEntry'];
        this.seeAlsoData[instanceNameType] = this.object[instanceNameType];
      } catch (e) {
        // Nessun dato 'seeAlso' trovato, gestisci di conseguenza
        this.seeAlsoData = {};
        this.seeAlsoData['array'] = [];
        this.seeAlsoData['parentNodeLabel'] = this.object['lexicalEntry'];
        this.seeAlsoData[instanceNameType] = this.object[instanceNameType];
      }

      // Calcola il conteggio dei collegamenti di tipo 'Reference'
      if (this.object.links != undefined) {
        this.object.links.forEach((element) => {
          if (element.type != undefined) {
            if (element.type == 'Reference') {
              element.elements.forEach((sub) => {
                this.counterElement += sub.count;
              });
            }
          }
        });
      }
    } else {
      // Resetta il contatore e i dati dei link se non ci sono nuovi dati del link
      this.counterElement = 0;
      this.sameAsData = null;
      this.seeAlsoData = null;
    }
  }

  ngOnDestroy(): void {
    // Annulla la sottoscrizione all'observable al momento della distruzione del componente
    this.refresh_subscription.unsubscribe();
  }
}
