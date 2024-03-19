import { Component, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from 'ng-modal-lib';
import { Subscription } from 'rxjs';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-cognate-panel',
  templateUrl: './cognate-panel.component.html',
  styleUrls: ['./cognate-panel.component.scss'],
})
export class CognatePanelComponent implements OnInit {
  /**
   * Questa classe rappresenta un componente per la gestione dei pannelli di cognate.
   */
  public lexicalEntryId: string;
  public cogInstanceName: any;
  public label: any;
  public subscription: Subscription;
  public lexicalEntryData: any;
  public id: any;

  @ViewChild('cognatePanelModal', { static: false })
  cognatePanelModal: ModalComponent;

  constructor(private lexicalService: LexicalEntriesService) {}

  ngOnInit(): void {}

  /**
   * Metodo per attivare il pannello di cognate.
   * @param data Dati opzionali da passare al pannello di cognate.
   */
  triggerCognatePanel(data?) {
    setTimeout(() => {
      this.cognatePanelModal.show();
    }, 100);
  }

  /**
   * Metodo chiamato alla chiusura del pannello modale.
   * Chiude il pannello e stampa tutte le forme di pannello disponibili.
   * @param cogInstanceName Nome dell'istanza di cognate.
   * @param lexInstanceName Nome dell'istanza lessicale.
   */
  onCloseModal(cogInstanceName, lexInstanceName) {
    this.lexicalService.closePanelForm(cogInstanceName, lexInstanceName);
    console.log(this.lexicalService.getAllPanelForms());
  }
}
