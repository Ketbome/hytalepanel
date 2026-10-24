<script setup lang="ts">
defineProps<{
  compare: {
    title: string;
    text: string;
    label: string;
    ours: string;
    theirs: string;
    rows: { name: string; ours: string; theirs: string }[];
  };
}>();
</script>

<template>
  <section class="hp-section hp-compare" aria-labelledby="hp-compare-title">
    <div class="hp-frame">
      <div class="intro">
        <h2 id="hp-compare-title" class="hp-h2" data-reveal>{{ compare.title }}</h2>
        <p class="hp-body text" data-reveal style="--d: 80ms">{{ compare.text }}</p>
      </div>
      <table class="table" data-reveal style="--d: 120ms">
        <colgroup>
          <col class="c-name" />
          <col class="c-ours" />
          <col class="c-theirs" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" class="name"><span class="hp-sr">{{ compare.label }}</span></th>
            <th scope="col" class="ours">{{ compare.ours }}</th>
            <th scope="col" class="theirs">{{ compare.theirs }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in compare.rows" :key="row.name">
            <th scope="row" class="name">{{ row.name }}</th>
            <td class="ours" :data-label="compare.ours">{{ row.ours }}</td>
            <td class="theirs" :data-label="compare.theirs">{{ row.theirs }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.intro {
  display: grid;
  gap: 20px;
  margin-bottom: 48px;
}

.text {
  max-width: 44ch;
  color: var(--hp-fg-2);
}

.table {
  display: block;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.table colgroup,
.table thead {
  display: none;
}

.table tbody,
.table tr {
  display: block;
}

.table tr {
  padding: 20px 0 4px;
}

.table tr:nth-child(odd) {
  background: var(--hp-bg-1);
  margin: 0 calc(-1 * var(--hp-gutter));
  padding-left: var(--hp-gutter);
  padding-right: var(--hp-gutter);
}

.table th,
.table td {
  display: block;
  padding: 0;
  border: 0;
  text-align: left;
}

.table tbody th {
  margin-bottom: 10px;
  font-size: 17px;
  font-weight: 600;
  line-height: 24px;
  color: var(--hp-fg-1);
}

.table td {
  display: grid;
  grid-template-columns: 9.5em minmax(0, 1fr);
  gap: 12px;
  padding: 10px 0;
  font-size: 16px;
  line-height: 22px;
  color: var(--hp-fg-2);
}

.table td::before {
  content: attr(data-label);
  font-weight: 500;
  color: var(--hp-fg-3);
}

.table td.ours {
  color: var(--hp-fg-1);
  font-weight: 500;
}

.table td.ours::before {
  color: var(--hp-accent);
  font-weight: 600;
}

@media (min-width: 960px) {
  .intro {
    grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--hp-gap);
    align-items: end;
    margin-bottom: 56px;
  }

  .intro .hp-h2 {
    grid-column: 1 / 7;
  }

  .text {
    grid-column: 7 / 12;
  }

  .table {
    display: table;
    table-layout: fixed;
  }

  .table colgroup {
    display: table-column-group;
  }

  .table thead {
    display: table-header-group;
  }

  .table tbody {
    display: table-row-group;
  }

  .table tr,
  .table tr:nth-child(odd) {
    display: table-row;
    margin: 0;
    padding: 0;
    background: transparent;
  }

  .c-name {
    width: 40%;
  }

  .c-ours,
  .c-theirs {
    width: 30%;
  }

  .table th,
  .table td {
    display: table-cell;
    height: 68px;
    padding: 0 24px;
    vertical-align: middle;
  }

  .table td::before {
    content: none;
  }

  .table thead th {
    height: auto;
    padding: 32px 24px 16px;
    font-size: 17px;
    font-weight: 600;
    color: var(--hp-fg-2);
  }

  .table thead th.ours {
    border-radius: var(--hp-radius-3) var(--hp-radius-3) 0 0;
    background: var(--hp-bg-3);
    font-family: var(--hp-font-display);
    font-size: 15px;
    letter-spacing: -0.01em;
    color: var(--hp-fg-1);
  }

  .table tbody th {
    margin: 0;
    padding-left: 20px;
    font-size: clamp(20px, 1.8vw, 24px);
    font-weight: 500;
  }

  .table tbody tr:nth-child(odd) th,
  .table tbody tr:nth-child(odd) td.theirs {
    background: var(--hp-bg-1);
  }

  .table td {
    font-size: 17px;
    line-height: 24px;
  }

  .table td.ours {
    margin: 0;
    padding: 0 24px;
    background: var(--hp-bg-3);
  }

  .table tbody tr:last-child td.ours {
    border-radius: 0 0 var(--hp-radius-3) var(--hp-radius-3);
  }

  .table td.theirs {
    color: var(--hp-fg-2);
  }

}
</style>
