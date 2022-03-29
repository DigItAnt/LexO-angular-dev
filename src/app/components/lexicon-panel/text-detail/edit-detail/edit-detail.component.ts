import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-edit-detail',
  templateUrl: './edit-detail.component.html',
  styleUrls: ['./edit-detail.component.scss']
})
export class EditDetailComponent implements OnInit {

  object : any;
  showTrigger = false;
  @ViewChild('navtabs') navtabs: ElementRef; 
  @ViewChild('navcontent') navcontent: ElementRef; 

  constructor(private lexicalService: LexicalEntriesService, private exp : ExpanderService) { }

  ngOnInit(): void {
    
    this.object = null;
    this.exp.openEdit$.subscribe(
      boolean => {
        if(boolean){
          setTimeout(() => {
            var text_detail = document.querySelectorAll('#text-dettaglio');
            text_detail.forEach(element => {
              if(!element.classList.contains('show')){
                element.classList.add('show')
              }
            })
            let a_link = document.querySelectorAll('a[data-target="#text-dettaglio"]');
            a_link.forEach(element => {
              if(element.classList.contains("collapsed")){
                element.classList.remove('collapsed')
              }else{
                //element.classList.add('collapsed')
              }
            })
           }, 100);
        }
      }
    )
    this.lexicalService.coreData$.subscribe(
      object => {
        if(object != null){
          if(object['lexicalEntryInstanceName'] != undefined ||
             object['formInstanceName'] != undefined ||
             object['senseInstanceName'] != undefined ||
             object['etymologyInstanceName'] != undefined){
               setTimeout(() => {
                var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a')
                this.object = object;
                navTabLinks.forEach(element => {
                  /* //console.log(element) */
                  if(element.text == 'Core'){
                    element.classList.add('active')
                  }else{
                    element.classList.remove('active')
                    //console.log(element.id)
                  }
                });
    
                
    
                var navContent = this.navcontent.nativeElement.querySelectorAll('.tab-pane');
                
                navContent.forEach(element => {
                  
                  if(element.id == 'core'){
                    element.classList.add('active')
                    element.classList.add('show')
                    /* console.log("picchio");
                    console.log(element) */
                  }else{
                    
                    element.classList.remove('active')
                    element.classList.remove('show')
                    /* console.log("picchio21")
                    console.log(element) */
                  }
                });
               }, 100);
            

          }else {
            this.object = null;
          }
        }
      }
    );

    this.lexicalService.etymologyData$.subscribe(
      object => {
        if(object != null){
          if(object['etymology']['etymologyInstanceName'] != undefined){
            this.object = object;
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a')
            
            navTabLinks.forEach(element => {
              //console.log(element.text)
              if(element.text == 'Etymology'){
                /* console.log("aggiungo active a:") */
                element.classList.add('active')

              }else{
                element.classList.remove('active')
                /* console.log("tolgo active a:") */
              }
            });
            var navContent = this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            
            navContent.forEach(element => {
              //console.log(element.id)
              if(element.id == 'etymology'){
                element.classList.add('active')
                element.classList.add('show')
              }else{
                element.classList.remove('active')
                element.classList.remove('show')
                //console.log(element.id)
              }
            });
            
          }else {
            this.object = null;
          }
        }
      }
    );
  }

  triggerExpansionEdit(){
 
    setTimeout(() => {

      if(this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()){
        if(this.exp.isEditTabExpanded() && !this.exp.isEpigraphyTabExpanded()){
          this.exp.openCollapseEdit();
          this.exp.expandCollapseEdit();
        }
      }else if(!this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()){
        if(!this.exp.isEditTabExpanded() && !this.exp.isEpigraphyTabExpanded()){
          this.exp.openCollapseEdit();
          this.exp.expandCollapseEdit();
        }
      }else if(this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()){
        this.exp.openCollapseEdit();
        this.exp.expandCollapseEpigraphy(true);
      }else if(!this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()){
        if(!this.exp.isEditTabExpanded() && this.exp.isEpigraphyTabExpanded()){
          this.exp.expandCollapseEpigraphy(false);
          this.exp.openCollapseEdit(true)
        }
        
      }
      
    }, 200);
  }

}
