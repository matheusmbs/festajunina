import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge-status',
  standalone: true,
  templateUrl: './badge-status.component.html',
  styleUrl: './badge-status.component.scss',
})
export class BadgeStatusComponent {
  @Input() disponivel = true;
}
