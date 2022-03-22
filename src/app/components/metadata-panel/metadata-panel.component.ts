import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';

@Component({
  selector: 'app-metadata-panel',
  templateUrl: './metadata-panel.component.html',
  styleUrls: ['./metadata-panel.component.scss']
})
export class MetadataPanelComponent implements OnInit, OnChanges {

  object : any;
  @Input() metadataData: any;

  constructor(private documentService : DocumentSystemService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges) { 
    console.log(changes)
    if(changes.metadataData.currentValue != null){
      this.object = changes.metadataData.currentValue;

      if(changes.metadataData.currentValue != this.object){
        this.object = null;
      }

      this.object = changes.metadataData.currentValue;
    }else{
      this.object = null;
      this.documentService.triggerMetadataPanel(false);
    }
    
  }
}
