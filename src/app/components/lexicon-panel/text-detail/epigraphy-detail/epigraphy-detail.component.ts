import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';

@Component({
  selector: 'app-epigraphy-detail',
  templateUrl: './epigraphy-detail.component.html',
  styleUrls: ['./epigraphy-detail.component.scss']
})
export class EpigraphyDetailComponent implements OnInit {

  @ViewChild('navTabsEpigraphy') navtabs: ElementRef; 
  @ViewChild('navContentEpigraphy') navcontent: ElementRef; 

  object : any;
  constructor(private documentService: DocumentSystemService, private exp : ExpanderService) { }

  ngOnInit(): void {

    this.documentService.epigraphyData$.subscribe(
      object => {
       /*  console.log(object) */
        if(object != null){
          setTimeout(() => {
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a')
            this.object = object;
            /* console.log(this.object) */
            navTabLinks.forEach(element => {
              /* //console.log(element) */
              if(element.text == 'Epigraphy'){
                element.classList.add('active')
              }else{
                element.classList.remove('active')
                //console.log(element.id)
              }
            });

            var navContent = this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            
            navContent.forEach(element => {
              
              if(element.id == 'epigraphy'){
                element.classList.add('active')
                element.classList.add('show')
              }else{
                
                element.classList.remove('active')
                element.classList.remove('show')
                //console.log(element)
              }
            });
          }, 200);
          
        }else{
          this.object = null;
          setTimeout(() => {
            var navTabLinks = this.navtabs.nativeElement.querySelectorAll('a')
            this.object = object;
            /* console.log(this.object) */
            navTabLinks.forEach(element => {
              /* //console.log(element) */
              if(element.text == 'Epigraphy'){
                element.classList.remove('active')
              }
            });

            var navContent = this.navcontent.nativeElement.querySelectorAll('.tab-pane');
            
            navContent.forEach(element => {
              
              if(element.id == 'epigraphy'){
                element.classList.remove('active')
                element.classList.remove('show')
              }
            });
          }, 200);
        }
      }
    );
  }

  triggerExpansionEpigraphy(){


    setTimeout(() => {
      if(!this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()){
        if(!this.exp.isEditTabExpanded() && this.exp.isEpigraphyTabExpanded()){
          this.exp.openCollapseEpigraphy();
          this.exp.expandCollapseEpigraphy();
        }
      }else if(!this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()){
        if(!this.exp.isEditTabExpanded() && !this.exp.isEpigraphyTabExpanded()){
          this.exp.openCollapseEpigraphy();
          this.exp.expandCollapseEpigraphy();
        }
      }else if(this.exp.isEditTabOpen() && this.exp.isEpigraphyTabOpen()){
        this.exp.openCollapseEpigraphy();
        this.exp.expandCollapseEdit(true);
      }else if(this.exp.isEditTabOpen() && !this.exp.isEpigraphyTabOpen()){
        if(this.exp.isEditTabExpanded() && !this.exp.isEpigraphyTabExpanded()){
          this.exp.expandCollapseEdit(false);
          this.exp.openCollapseEpigraphy(true)
        }
        
      }
    }, 200);
  }
}
