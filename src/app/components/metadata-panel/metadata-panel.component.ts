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
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';

@Component({
  selector: 'app-metadata-panel',
  templateUrl: './metadata-panel.component.html',
  styleUrls: ['./metadata-panel.component.scss'],
})
export class MetadataPanelComponent implements OnInit, OnChanges {
  object: any;
  @Input() metadataData: any;

  constructor(private documentService: DocumentSystemService) {}

  ngOnInit(): void {}

  // Questo metodo viene chiamato quando ci sono cambiamenti nei dati di input del componente.
  // Accetta un oggetto di tipo SimpleChanges che contiene i cambiamenti rilevati.
  ngOnChanges(changes: SimpleChanges) {
    console.log(changes); // Stampa i cambiamenti nel log per scopi di debug.

    // Verifica se il nuovo valore di 'metadataData' è diverso da null.
    if (changes.metadataData.currentValue != null) {
      // Se il nuovo valore non è nullo, assegna 'object' al nuovo valore.
      this.object = changes.metadataData.currentValue;

      // Verifica se il nuovo valore è diverso dall'oggetto corrente.
      if (changes.metadataData.currentValue != this.object) {
        // Se il nuovo valore è diverso, assegna null all'oggetto.
        this.object = null;
      }

      // Assegna 'object' al nuovo valore di 'metadataData'.
      this.object = changes.metadataData.currentValue;
    } else {
      // Se il nuovo valore di 'metadataData' è null, assegna null all'oggetto.
      this.object = null;

      // Disattiva il pannello di metadati tramite il servizio 'documentService'.
      this.documentService.triggerMetadataPanel(false);
    }
  }

  // Funzione per verificare se un valore è un array.
  isArray(val): boolean {
    return Array.isArray(val);
  }

  // Funzione per verificare se un valore è un numero.
  isNumber(val): boolean {
    return typeof val == 'number';
  }

  // Funzione per verificare se un valore è un oggetto (non un array).
  isObject(val): boolean {
    return typeof val === 'object' && !Array.isArray(val);
  }

  // Funzione per verificare se un valore è un link.
  isLink(val): boolean {
    // Espressione regolare per verificare se il valore è un link valido.
    const re = /((http|https):\/\/)(([\w.-]*)\.([\w]*))/;
    return val.match(re); // Restituisce true se il valore corrisponde alla regex, altrimenti false.
  }
}
