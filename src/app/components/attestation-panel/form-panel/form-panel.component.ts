import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ModalComponent } from 'ng-modal-lib';
import { Subscription } from 'rxjs';
import { debounceTime, first } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';

@Component({
  selector: 'app-form-panel',
  templateUrl: './form-panel.component.html',
  styleUrls: ['./form-panel.component.scss']
})
export class FormPanelComponent implements OnInit, OnDestroy {
  public formId: string;
  public label : any;
  public subscription: Subscription;
  public formData : any;
  public id : any;


  // Riferimento al componente Modal utilizzato per visualizzare il pannello del form.
  @ViewChild('formPanelModal', {static: false}) formPanelModal: ModalComponent;
  
  constructor(private annotatorService : AnnotatorService) { }

  ngOnInit(): void {
    
  }

  ngOnDestroy() : void {
    // Pulizia risorse; annulla la sottoscrizione per evitare perdite di memoria.
    this.subscription.unsubscribe();
  }

  // Funzione per attivare il pannello del form, con opzione per passare dati al pannello.
  triggerFormPanel(data?){
    setTimeout(() => {
      // Visualizza il modal dopo un ritardo di 100ms.
      this.formPanelModal.show();
    }, 100);
    
  }

  // Funzione chiamata alla chiusura del modal, che notifica il servizio per chiudere il pannello del form.
  onCloseModal(idForm){
    // Notifica al servizio di annotazione la chiusura del form.
    this.annotatorService.closePanelForm(idForm);
    // Stampa a console l'elenco dei form panel attualmente aperti (per debug).
    console.log(this.annotatorService.getAllPanelForms());
  }
}
