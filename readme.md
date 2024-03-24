## Función: `frequencyFromNoteNumber(note)`

Esta función calcula la frecuencia de una nota musical a partir de su número de nota MIDI.

### Parámetro:
- `note`: El número de la nota MIDI para la cual se desea calcular la frecuencia. Este número está en el rango de 0 a 127, donde 69 representa la nota A4 (la octava central del piano) y cada número representa una nota específica en la escala musical.

### Explicación de la fórmula:
La fórmula utilizada en esta función está basada en la fórmula estándar utilizada en la teoría musical y la acústica para calcular la frecuencia de una nota musical a partir de su posición en la escala MIDI.

- **440 Hz**: Este es el estándar de referencia para la nota A4, que es la octava central del piano y es ampliamente utilizada como referencia en la música. La frecuencia de la nota A4 es de 440 Hz.

- `Math.pow(2, (note - 69) / 12)`: Esta parte de la fórmula calcula la relación de frecuencia entre la nota dada y la nota A4 (69). La diferencia entre el número de la nota dada y 69 (A4) nos da el número de semitonos de distancia entre las dos notas. Como hay 12 semitonos en una octava, dividimos esta diferencia por 12 para obtener el número de octavas completas de separación. Luego, elevamos 2 a esta potencia para obtener la relación de frecuencia en esa cantidad de octavas.

#### Desglose de la fórmula:
- `(note - 69)`: Calcula la distancia en semitonos entre la nota dada y la nota A4.
- `(note - 69) / 12`: Convierte la distancia de semitonos a distancia de octavas.
- `Math.pow(2, (note - 69) / 12)`: Calcula la relación de frecuencia basada en la distancia de octavas.
- `440 * Math.pow(2, (note - 69) / 12)`: Multiplica esta relación de frecuencia por 440 Hz (la frecuencia de A4) para obtener la frecuencia de la nota dada.

### Ejemplo:
Si `note` es 69 (que es la nota A4), la fórmula devuelve 440 Hz, que es la frecuencia estándar para la nota A4. Si `note` es mayor que 69, la frecuencia devuelta será mayor, y si `note` es menor que 69, la frecuencia devuelta será menor, lo que representa las notas más altas o más bajas en la escala musical, respectivamente.

En resumen, esta función proporciona una forma conveniente de calcular la frecuencia de una nota musical específica utilizando su número de nota MIDI correspondiente.
