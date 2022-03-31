import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ModalComponent } from 'ng-modal-lib';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { BibliographyService } from 'src/app/services/bibliography-service/bibliography.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-attestation-panel',
  templateUrl: './attestation-panel.component.html',
  styleUrls: ['./attestation-panel.component.scss']
})
export class AttestationPanelComponent implements OnInit,OnChanges {

  @Input() attestationData: any;
  @ViewChild('addBibliographyAttestation', {static: false}) modal: ModalComponent;
  @ViewChild('table_body') tableBody: ElementRef;
  bibliography = [];
  private update_anno_subject: Subject<any> = new Subject();
  private update_biblio_anno_subject: Subject<any> = new Subject();
  private searchSubject : Subject<any> = new Subject();

  start = 0;
  sortField = 'title';
  direction = 'asc';
  memorySort = {field : '', direction : ''}
  queryTitle = '';
  queryMode = 'titleCreatorYear';
  selectedItem;
  selectedAnnotation;
  constructor(private toastr: ToastrService, private biblioService : BibliographyService, private expander: ExpanderService, private annotatorService : AnnotatorService, private lexicalService : LexicalEntriesService) { }
  
  
  formData = [];
  ngOnInit(): void {

    this.update_anno_subject.pipe(debounceTime(1000)).subscribe(
      data => {
        if(data != null){
          this.updateAnnotation(data)
        }
      }
    )

    this.update_biblio_anno_subject.pipe(debounceTime(100)).subscribe(
      data => {
        if(data != null){
          this.updateBiblioAnnotation(data)
        }
      }
    )

    this.biblioService.bootstrapData(this.start, this.sortField, this.direction).subscribe(
      data=> {
        this.memorySort = {field : this.sortField, direction : this.direction}
        this.bibliography = data;
        this.bibliography.forEach(element => {
          element['selected'] = false;
        })
        
        
        //@ts-ignore
        $('#biblioModalAnnotation').modal('hide');
        $('.modal-backdrop').remove();
      },error=>{
        console.log(error)
      }
    )

    this.searchSubject.pipe(debounceTime(1000)).subscribe(
      data => {
        this.queryTitle  = data.query;
        data.queryMode ? this.queryMode = 'everything' : this.queryMode = 'titleCreatorYear';
        this.searchBibliography(this.queryTitle, this.queryMode);
      }
    )
  }
  

  ngOnChanges(changes: SimpleChanges) { 
    
    console.log(changes)
    if(changes.attestationData.currentValue != null){
      setTimeout(() => {

        if(changes.attestationData.currentValue != this.formData){
          this.formData = [];
          this.selectedItem = null;
          this.selectedAnnotation = null;
        }
        this.formData = changes.attestationData.currentValue;
        console.log(this.formData)
        if(this.formData.length == 0){
          this.lexicalService.triggerAttestationPanel(false)
        }
        
      }, 10);
      
    }else{
      this.formData = [];
      this.selectedItem = null;
      this.selectedAnnotation = null;
    }
  }

  cancelAttestation(index, id, node_id){
    this.formData.splice(index,1);
    this.annotatorService.deleteAnnotationRequest(id, node_id);
    this.annotatorService.deleteAnnotation(id).subscribe(
      data=> {
        console.log(data);
        this.toastr.success('Attestation deleted correctly', 'Info', {
          timeOut : 5000
        })
      },error => {
        console.log(error);
        this.toastr.error('Error on deleting attestation', 'Error', {
          timeOut : 5000
        })
      }
    );
    if(this.formData.length == 0){
      this.lexicalService.triggerAttestationPanel(false);
      this.lexicalService.sendToCoreTab(null);
      /* this.expander.openCollapseEdit(false);
      this.expander.expandCollapseEdit(false);

      this.expander.openCollapseEpigraphy(true);
      this.expander.expandCollapseEpigraphy(true); */
    }
  }

  triggerUpdateAttestation(evt, newValue, propKey, annotation){
    this.update_anno_subject.next({event : evt, newValue : newValue, propKey: propKey, annotation : annotation})
  }

  debounceKeyup(value, annotation, index, field){
    this.update_biblio_anno_subject.next({v: value, a: annotation, i: index, f: field})
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
          console.log(data);
          this.toastr.success('Attestation updated correctly', 'Info', {
            timeOut : 5000
          })
        },error => {
          console.log(error);
          this.toastr.error('Error on updating attestation', 'Error', {
            timeOut : 5000
          })
        }
      )

    } 
  }

  updateBiblioAnnotation(data){
    if(data != null){
      console.log(data);

      let id_annotation = data?.a.id;
      let newValue = data?.v;
      let index = data?.i;
      let field = data?.f;

      this.formData.forEach(
        element=>{
          if(element.id == id_annotation){
            element.attributes.bibliography[index][field] = newValue;
          }
        }
      )
      let annotation = data?.a;
      console.log(annotation)
      this.annotatorService.updateAnnotation(annotation).subscribe(
        data=> {
          console.log(data);
          this.toastr.success('Attestation updated correctly', 'Info', {
            timeOut : 5000
          })
        },error => {
          console.log(error);
          this.toastr.error('Error on updating attestation', 'Error', {
            timeOut : 5000
          })
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

  showBiblioModal(item){
    this.selectedAnnotation = item;
    this.modal.show();
  }

  checkIfCreatorExist(item?){
    return item.some(element => element.creatorType === 'author')
  }

  selectItem(evt, i){
    /* console.log(evt, i); */
    if(evt.shiftKey){

    }
    this.bibliography.forEach(element=> {
      if(element.key == i.key){
        element.selected = !element.selected;
        element.selected ? this.selectedItem = element : this.selectedItem = null;
        return true;
      }else{
        element.selected = false;
        return false;
      }
    })
    
  }

  onCloseModal(){
    this.selectedItem = null;
    this.start = 0;
    this.sortField = 'title';
    this.direction = 'asc';
    this.tableBody.nativeElement.scrollTop = 0;
    this.memorySort = { field: this.sortField, direction: this.direction}
    this.biblioService.bootstrapData(this.start, this.sortField, this.direction).subscribe(
      data=> {
        this.bibliography = data;
        this.bibliography.forEach(element => {
          element['selected'] = false;
        }) 
                
       
      },error=>{
        console.log(error)
      }
    );
  }

  onScrollDown(){
    //@ts-ignore
    $("#biblioModalAnnotation").modal("show");
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({backdrop: 'static', keyboard: false})  
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");

    this.start += 25;
    
    if(this.queryTitle != ''){
      this.biblioService.filterBibliography(this.start, this.sortField, this.direction, this.queryTitle, this.queryMode).subscribe(
        data=>{
          console.log(data)
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
          data.forEach(element => {
            this.bibliography.push(element)
          });
        },error=>{
          console.log(error)
        }
      )
    }else{
      this.biblioService.filterBibliography(this.start, this.sortField, this.direction, this.queryTitle, this.queryMode).subscribe(
        data=> {
          
          data.forEach(element => {
            this.bibliography.push(element)
          });
                  
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
        },error=>{
          console.log(error)
        }
      );
    }

    
  }

  addBibliographyItem(item?){
    //@ts-ignore
    $("#biblioModalAnnotation").modal("show");
    $('.modal-backdrop').appendTo('.ui-modal');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({backdrop: 'static', keyboard: false})  
    
    $('.modal-backdrop').css('height', 'inherit');
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");

    let instance = '';
    /* if(this.object.lexicalEntryInstanceName != undefined
      && this.object.lexicalEntryInstanceName.senseInstanceName == undefined){
        instance = this.object.lexicalEntryInstanceName;
    }else if(this.object.formInstanceName != undefined){
      instance = this.object.formInstanceName;
    }else if(this.object.senseInstanceName != undefined){
      instance = this.object.senseInstanceName;
    } */

    if(item != undefined){

      let id = item.data.key != undefined ? item.data.key : '';
      let title = item.data.title != undefined ? item.data.title : '';
      let author;
      
      item.data.creators.forEach(element => {
        if(element.creatorType == 'author'){
          author = element.lastName + ' ' + element.firstName;
          return true;
        }else{
          return false;
        }
      });
      author = author != undefined ? author : ''
      let date = item.data.date != undefined ? item.data.date : '';
      let url = item.data.url != undefined ? item.data.url : ''
      let seeAlsoLink = '';

      item.data['note'] = "";;
      item.data['textualRef'] = "";

      let parameters = {
        id : id,
        title: title,
        author: author,
        date: date,
        url: url,
        seeAlsoLink: seeAlsoLink
      }

      console.log(item, this.selectedAnnotation);
      this.modal.hide();

     let anno_id = this.selectedAnnotation.id;

      this.formData.forEach(
        attestation => {
          if(attestation.id == anno_id){
            console.log(attestation)
            attestation?.attributes?.bibliography.push(item?.data)
          }
        }
      );

      this.annotatorService.updateAnnotation(this.selectedAnnotation).subscribe(
        data=>{
          console.log(data);
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();

          this.modal.hide();

          this.toastr.success('Item added correctly', 'Info', {
            timeOut : 5000
          })

        },error=>{
          console.log(error);
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();

          this.modal.hide();

          this.toastr.error('Error on adding item', 'Info', {
            timeOut : 5000
          })

        }
      )
      /* this.annotatorService.updateAnnotation() */
      /*       
      this.lexicalService.addBibliographyData(instance, parameters).subscribe(
        data=>{
          console.log(data);
          setTimeout(() => {
            //@ts-ignore
            $('#biblioModal').modal('hide');
            $('.modal-backdrop').remove();
            this.toastr.success('Item added, check bibliography panel', '', {
              timeOut: 5000,
            });
            this.biblioService.triggerPanel(data)
            setTimeout(() => {
              this.modal.hide();
            }, 10);
          }, 300);
          this.biblioService.sendDataToBibliographyPanel(data);
        },error=>{
          console.log(error)
          if(typeof(error.error) == 'string' && error.error.length < 1000){
            this.toastr.error(error.error, '', {
              timeOut: 5000,
            });
          }else{
            this.toastr.error(error.statusText, '', {
              timeOut: 5000,
            });
          }
          
          setTimeout(() => {
            //@ts-ignore
            $('#biblioModal').modal('hide');
            $('.modal-backdrop').remove();

            setTimeout(() => {
              this.modal.hide();
            }, 10);
          }, 300);
          
        }
      ) */
    }
    
  }

  sortBibliography(evt?, val?){
    
    
    if(this.memorySort.field == val){
      if(this.direction == 'asc'){
        this.direction = 'desc'
        this.memorySort.direction = 'desc';
      }else{
        this.direction = 'asc';
        this.memorySort.direction = 'asc';
      }
    }else{
      this.sortField = val;
      this.direction = 'asc';
      this.memorySort = {field : this.sortField, direction : this.direction};
    }

    //@ts-ignore
    $("#biblioModalAnnotation").modal("show");
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({backdrop: 'static', keyboard: false})  
    $('.modal-backdrop').appendTo('.table-body');
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");
    this.start = 0;
    this.tableBody.nativeElement.scrollTop = 0;

    this.biblioService.filterBibliography(this.start, this.sortField, this.direction, this.queryTitle, this.queryMode).subscribe(
      data=>{
        console.log(data)
        this.bibliography = [];
        //@ts-ignore
        $('#biblioModalAnnotation').modal('hide');
        $('.modal-backdrop').remove();
        data.forEach(element => {
          this.bibliography.push(element)
        });
      },error=>{
        console.log(error)
      }
    )
    
  }

  removeItem(item, j) {
    console.log(item, j)
    
    this.formData.forEach(
      annotation=>{
        if(item?.id == annotation.id){
          annotation.attributes.bibliography.splice(j, 1)
        }
      }
    )

    this.annotatorService.updateAnnotation(item).subscribe(
      data=>{
        console.log(data)
        this.toastr.success('Attestation removed correctly', 'Info', {
          timeOut : 5000
        })
      },
      error=>{
        console.log(error)
        this.toastr.error('Error on removing attestation', 'Error', {
          timeOut : 5000
        })
      }
    )
    console.log(this.formData, item)
  }

  triggerSearch(evt, query, queryMode) {
    if(evt.key != 'Control' && evt.key != 'Shift' && evt.key != 'Alt'){
      this.searchSubject.next({query, queryMode})
    }
  }
  
  searchBibliography(query?:string, queryMode?:any){
    this.start = 0;
    this.selectedItem = null;
    //@ts-ignore
    $("#biblioModalAnnotation").modal("show");
    $('.modal-backdrop').appendTo('.table-body');
    //@ts-ignore
    $('#biblioModalAnnotation').modal({backdrop: 'static', keyboard: false})  
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");
    this.tableBody.nativeElement.scrollTop = 0;
    if(this.queryTitle != ''){
      this.biblioService.filterBibliography(this.start, this.sortField, this.direction, this.queryTitle, this.queryMode).subscribe(
        data => {
          console.log(data);
          this.bibliography = [];
          data.forEach(element => {
            this.bibliography.push(element)
          });
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
        },
        error => {
          console.log(error)
        }
      )
    }else{
      this.biblioService.filterBibliography(this.start, this.sortField, this.direction, this.queryTitle, this.queryMode).subscribe(
        data => {
          console.log(data);
          this.bibliography = [];
          data.forEach(element => {
            this.bibliography.push(element)
          });
          //@ts-ignore
          $('#biblioModalAnnotation').modal('hide');
          $('.modal-backdrop').remove();
        },
        error => {
          console.log(error)
        }
      )
    }
  }
}
