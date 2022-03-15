import { trigger, state, style, transition, animate } from '@angular/animations';
import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as Recogito from '@recogito/recogito-js';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';


@Component({
  selector: 'app-epigraphy-tab',
  templateUrl: './epigraphy-tab.component.html',
  styleUrls: ['./epigraphy-tab.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        height: 'calc(100vh - 20rem)',
        
      })),
      state('out', style({
        height: 'calc(50vh - 12rem)',
      })),
      transition('in => out', animate('400ms ease-in-out')),
      transition('out => in', animate('400ms ease-in-out'))
    ])
  ]
})

export class EpigraphyTabComponent implements OnInit {
  exp_trig = '';
  name: any;
  revisor:any;
  object : any;
  epigraphyData: any;
  @ViewChild('expanderEpigraphy') expander_body: ElementRef;

  constructor(private documentService: DocumentSystemService, private expand : ExpanderService, private rend: Renderer2) { }

  ngOnInit(): void {

    this.documentService.epigraphyData$.subscribe(
      object => {
        if(this.object != object){
          this.epigraphyData = null; 
        }

        console.log(object)

        if(object!=null){
          this.object = object

          this.epigraphyData = this.object;
          if(this.object != null){
            setTimeout(() => {
              //@ts-ignore
              $('#epigraphyTabModal').modal('hide');
              $('.modal-backdrop').remove();
              var timer = setInterval((val)=>{                 
                try{
                    //@ts-ignore
                    $('#epigraphyTabModal').modal('hide');
                    if(!$('#epigraphyTabModal').is(':visible')){
                      clearInterval(timer)
                    }
                    
                }catch(e){
                    console.log(e)
                }    
              }, 10)
            }, 500);
            /* this.name = this.object.name; */
  /*           this.revisor = this.object.revisor;
   */          
            
          }
        }else{
          this.epigraphyData = null;
        }
        
      }
    );
    
    /* console.log('My Content: ' + document.getElementById('pippo'));

    var r = Recogito.init({
      content: document.getElementById('pippo'), // Element id or DOM node to attach to
      locale: 'auto',
      widgets: [
        //I intend to include this plugin this way.
        //{ widget: Recogito.CommentsMention, userSuggestions: users },
        { widget: 'COMMENT' },
        { widget: 'TAG', vocabulary: ['Place', 'Person', 'Event', 'Organization', 'Animal'] }
      ],
      //relationVocabulary: ['isRelated', 'isPartOf', 'isSameAs ']
    });

    // Add an event handler  
    r.on('createAnnotation', function (annotation) {
      console.log('Annotation Added: ' + JSON.stringify(annotation))
    });

    r.on('selectAnnotation', function(a) {
      console.log('selected', a);
    });

    r.on('updateAnnotation', function(annotation, previous) {
      console.log('updated', previous, 'with', annotation);
    });

    // Switch annotation mode (annotation/relationships)
    var annotationMode = 'ANNOTATION'; // or 'RELATIONS'

    var toggleModeBtn = document.getElementById('toggle-mode');
    toggleModeBtn.addEventListener('click', function() {
      if (annotationMode === 'ANNOTATION') {
        toggleModeBtn.innerHTML = 'MODE: RELATIONS';
        annotationMode = 'RELATIONS';
      } else  {
        toggleModeBtn.innerHTML = 'MODE: ANNOTATION';
        annotationMode = 'ANNOTATION';
      }

      r.setMode(annotationMode);
    }); */

    this.expand.expEpigraphy$.subscribe(
      trigger => {
        setTimeout(() => {
          console.log("trigger epigraphy-tab: ", trigger)
          if(trigger){
            let isEditExpanded = this.expand.isEditTabExpanded();
            let isEpigraphyExpanded = this.expand.isEpigraphyTabExpanded();
            console.log(isEditExpanded, isEpigraphyExpanded)
            
            if(!isEditExpanded){
              
              this.rend.setStyle(this.expander_body.nativeElement, 'height', 'calc(100vh - 20rem)')
              this.exp_trig = 'in';
              this.rend.setStyle(this.expander_body.nativeElement, 'max-height', 'calc(100vh - 20rem)');
            }else{
              
              this.rend.setStyle(this.expander_body.nativeElement, 'height', 'calc(50vh - 15rem)');
              this.exp_trig = 'in';
              this.rend.setStyle(this.expander_body.nativeElement, 'max-height', 'calc(50vh - 15rem)');
              
            }
            
            
          }else if(trigger==null){
            return;
          }else{
            this.rend.setStyle(this.expander_body.nativeElement, 'height', 'calc(50vh - 15rem)');
            this.rend.setStyle(this.expander_body.nativeElement, 'max-height', 'calc(50vh - 15rem)');
            this.exp_trig = 'out';
          }
        }, 100);
        
      }
    );

    this.expand.expEdit$.subscribe(
      trigger => {
        if(trigger){
          this.exp_trig = 'in';
          this.rend.setStyle(this.expander_body.nativeElement, 'height', 'calc(50vh - 15rem)')
          this.rend.setStyle(this.expander_body.nativeElement, 'max-height', 'calc(50vh - 15rem)')
        }else if(trigger==null){
          return;
        }else{
          this.rend.setStyle(this.expander_body.nativeElement, 'max-height', 'calc(50vh - 15rem)');
          this.exp_trig = 'out';
        }
      }
    );
  }

  

}
