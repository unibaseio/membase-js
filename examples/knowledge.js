import {
    Document,
    Chroma,
} from '../src/index.js';

console.log('=== Membase JS Library Test ===\n');

console.log('\n1. === Knowledge Base Test ===');
try {
    // Test Document
    const doc1 = new Document('This is a test document about artificial intelligence and machine learning.');
    doc1.updateMetadata('category', 'AI');
    doc1.updateMetadata('tags', ['AI', 'ML', 'test']);

    const doc2 = new Document('Another document about blockchain technology and smart contracts.');
    doc2.updateMetadata('category', 'Blockchain');
    doc2.updateMetadata('tags', ['blockchain', 'smart contracts', 'test']);

    console.log('✓ Documents created');
    console.log('  Doc1 ID:', doc1.docId);
    console.log('  Doc1 metadata:', Object.keys(doc1.metadata));
    console.log('  Doc2 content length:', doc2.content.length);

    // Test serialization
    const docDict = doc1.toDict();
    const restoredDoc = Document.fromDict(docDict);
    console.log('✓ Document serialization works');
    console.log('  Original content === Restored content:', doc1.content === restoredDoc.content);

    // Test Chroma (without actual connection)
    const chromaHost = process.env.MEMBASE_CHROMA_HOST || 'localhost';
    const chromaPort = process.env.MEMBASE_CHROMA_PORT || 8000;
    const chroma = new Chroma(chromaHost, chromaPort, 'test-collection');
    console.log('✓ Chroma client initialized');
    console.log('  Host:', chroma.host);
    console.log('  Port:', chroma.port);
    console.log('  Collection:', chroma.collectionName);
    console.log('  Base URL:', chroma.baseUrl);

} catch (error) {
    console.log('✗ Knowledge base test failed:', error.message);
}

console.log('\n=== Test Summary ===');
console.log('All basic functionality tests completed.');
console.log('Note: Some tests require proper environment setup and running services.');
console.log('\nEnvironment variables to set for full functionality:');
console.log('- MEMBASE_ID, MEMBASE_ACCOUNT, MEMBASE_SECRET_KEY');
console.log('- MEMBASE_HUB');
console.log('- MEMBASE_CHROMA_HOST, MEMBASE_CHROMA_PORT'); 