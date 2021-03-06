import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { PostyBirbSubmission } from '../../../../../commons/models/posty-birb/posty-birb-submission';
import { FileInformation } from '../../../../../commons/models/file-information';

@Component({
  selector: 'add-submission-file',
  templateUrl: './add-submission-file.component.html',
  styleUrls: ['./add-submission-file.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddSubmissionFileComponent implements OnInit {
  @Output() added: EventEmitter<PostyBirbSubmission[]> = new EventEmitter();
  @ViewChild('fileInput') fileInput: ElementRef;

  constructor() { }

  ngOnInit() {
  }

  public async filesSelected(event: Event) {
    const files: File[] = event.target['files'];

    const convertedList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      convertedList.push(files[i]);
    }

    this.emit(this.createPostyBirbSubmissions(convertedList));
    this.fileInput.nativeElement.value = '';
  }

  public async fileDrop(event: DragEvent) {
    const fileList: FileList = event.dataTransfer.files;
    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      files.push(fileList[i]);
    }

    this.emit(this.createPostyBirbSubmissions(files));

    event.dataTransfer.clearData();
  }

  public copyFromClipboard(): void {
    const { availableFormats, content } = getClipboardContents();

    if (availableFormats.includes('image/png')) {
      const buffer = content.toJPEG(100);

      const fileInfo: FileInformation = new FileInformation(buffer, true);
      const pbs: PostyBirbSubmission = new PostyBirbSubmission(null, fileInfo);
      pbs.getPreloadedSubmissionFile().then(() => this.emit([pbs]));
    }
  }

  public enableClipboardCopy(): boolean {
    return getClipboardFormats().includes('image/png');
  }

  private createPostyBirbSubmissions(files: File[]): PostyBirbSubmission[] {
    return files
      .filter(file => file.size <= 200000000)
      .map(file => {
        return new PostyBirbSubmission(null, new FileInformation(file, true));
      });
  }

  private emit(newSubmissions: PostyBirbSubmission[]): void {
    this.added.emit(newSubmissions);
  }

}
