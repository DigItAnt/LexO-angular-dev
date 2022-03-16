import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-attestation-panel',
  templateUrl: './attestation-panel.component.html',
  styleUrls: ['./attestation-panel.component.scss']
})
export class AttestationPanelComponent implements OnInit,OnChanges {

  @Input() attestationData: any;
  private update_anno_subject: Subject<any> = new Subject();
  constructor(private expander: ExpanderService, private annotatorService : AnnotatorService, private lexicalService : LexicalEntriesService) { }

  formData = [];
  ngOnInit(): void {

    this.update_anno_subject.pipe(debounceTime(1000)).subscribe(
      data => {
        if(data != null){
          this.updateAnnotation(data)
        }
      }
    )
  }
  

  ngOnChanges(changes: SimpleChanges) { 
    
    console.log(changes)
    if(changes.attestationData.currentValue != null){
      setTimeout(() => {

        if(changes.attestationData.currentValue != this.formData){
          this.formData = [];
        }
        this.formData = changes.attestationData.currentValue;

        if(this.formData.length == 0){
          this.lexicalService.triggerAttestationPanel(false)
        }
        
      }, 10);
      
    }
  }

  cancelAttestation(index, id){
    this.formData.splice(index,1);
    this.annotatorService.deleteAnnotationRequest(id);
    this.annotatorService.deleteAnnotation(id).subscribe(
      data=> {
        console.log(data)
      },error => {
        console.log(error)
      }
    );
    if(this.formData.length == 0){
      this.lexicalService.triggerAttestationPanel(false);
      this.lexicalService.sendToCoreTab(null);
      this.expander.openCollapseEdit(false);
      this.expander.expandCollapseEdit(false);

      this.expander.openCollapseEpigraphy(true);
      this.expander.expandCollapseEpigraphy(true);
    }
  }

  triggerUpdateAttestation(evt, newValue, propKey, annotation){
    this.update_anno_subject.next({event : evt, newValue : newValue, propKey: propKey, annotation : annotation})
  }

  updateAnnotation(data){
    if(data !=null){
      let id_annotation = data?.annotation?.id;
      let newValue = data?.newValue;
      let property = data?.propKey;

      let annotation = data?.annotation; 

      annotation.attributes[property] = newValue;

      this.annotatorService.updateAnnotation(annotation).subscribe(
        data=> {
          console.log(data)
        },error =>{
          console.log(error)
        }
      )

    } 
  }

  getForm(formId){
    
    this.lexicalService.getFormData(formId, 'core').subscribe(
      data=>{
        console.log(data);
        this.lexicalService.sendToCoreTab(data)
        this.lexicalService.sendToEtymologyTab(null);
        this.lexicalService.sendToRightTab(data);
        this.lexicalService.updateLexCard({lastUpdate : data['lastUpdate'], creationDate : data['creationDate']});
        
        if(this.expander.isEpigraphyTabOpen() && !this.expander.isEditTabOpen()){
          if(this.expander.isEpigraphyTabExpanded() && !this.expander.isEditTabExpanded()){
            this.expander.openCollapseEdit(true);
            this.expander.expandCollapseEpigraphy(false)
          }
        }
        
        var text_detail = document.querySelectorAll('#text-dettaglio');
        text_detail.forEach(element => {
          if(!element.classList.contains('show')){
            element.classList.add('show')
          }
        })
      },
      error=>{
        console.log(error)
      }
    )
  }

}
