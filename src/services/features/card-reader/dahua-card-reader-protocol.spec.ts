import {
  buildCardNumberRequest,
  buildPrompt,
  DahuaFrameAssembler,
  parseCardNumberResponse,
  toReports,
} from './dahua-card-reader-protocol';

const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
const bytes = (s: string) => s.split(' ').map((b) => parseInt(b, 16));

describe('Dahua card reader protocol', () => {
  // Requests are the frames DSS CardReader.dll sends; verified byte-for-byte on the device.
  it('builds the DSS request frames', () => {
    expect(hex(buildPrompt(true))).toBe('48 01 00 07 89 01 DA');
    expect(hex(buildCardNumberRequest(0x00))).toBe('48 01 00 07 01 00 51');
    expect(hex(buildCardNumberRequest(0x03))).toBe('48 01 00 07 01 03 54');
    expect(hex(buildCardNumberRequest(0x04))).toBe('48 01 00 07 01 04 55');
  });

  it('pads frames into 8-byte reports', () => {
    const reports = toReports(buildCardNumberRequest(0));
    expect(reports.length).toBe(1);
    expect(hex(reports[0])).toBe('48 01 00 07 01 00 51 00');
  });

  // Input reports captured from the reader with no card present.
  it('parses a captured "no card" reply split over two reports', () => {
    const assembler = new DahuaFrameAssembler();
    expect(assembler.push(bytes('48 01 00 0C 81 00 00 00'))).toBeNull();
    const frame = assembler.push(bytes('00 00 00 D6 00 00 00 00'));
    expect(frame).not.toBeNull();
    expect(parseCardNumberResponse(frame!)).toEqual({ cardType: 0, cardNumber: '' });
  });

  it('ignores card-type 3 replies like DSS does', () => {
    const assembler = new DahuaFrameAssembler();
    assembler.push(bytes('48 01 00 0C 81 03 00 00'));
    const frame = assembler.push(bytes('00 00 00 D9 00 00 00 00'));
    expect(parseCardNumberResponse(frame!)).toBeNull();
  });

  // Captured from the reader while DSS Client enrolled a card; DSS displayed it as 0004D0E7.
  it('parses a captured card reply to the number DSS shows', () => {
    const assembler = new DahuaFrameAssembler();
    expect(assembler.push(bytes('48 01 00 0C 81 04 04 00'))).toBeNull();
    const frame = assembler.push(bytes('04 D0 E7 99 00 00 00 00'));
    expect(parseCardNumberResponse(frame!)).toEqual({ cardType: 4, cardNumber: '0004D0E7' });
  });

  it('formats card bytes as upper-case two-digit hex', () => {
    const assembler = new DahuaFrameAssembler();
    const head = bytes('48 01 00 0C 81 00 04 0A');
    const body = [0x3b, 0x2c, 0x1d];
    const sum = [...head, ...body].reduce((a, b) => (a + b) & 0xff, 0);
    assembler.push(head);
    const frame = assembler.push([...body, sum, 0, 0, 0, 0]);
    expect(parseCardNumberResponse(frame!)).toEqual({ cardType: 0, cardNumber: '0A3B2C1D' });
  });

  it('drops frames with a bad checksum or header', () => {
    const assembler = new DahuaFrameAssembler();
    assembler.push(bytes('48 01 00 0C 81 00 00 00'));
    expect(assembler.push(bytes('00 00 00 D7 00 00 00 00'))).toBeNull();
    expect(assembler.push(bytes('00 00 00 D6 00 00 00 00'))).toBeNull();
    // after the bad data the assembler resynchronises on the next header
    assembler.push(bytes('48 01 00 0C 81 00 00 00'));
    expect(assembler.push(bytes('00 00 00 D6 00 00 00 00'))).not.toBeNull();
  });
});
